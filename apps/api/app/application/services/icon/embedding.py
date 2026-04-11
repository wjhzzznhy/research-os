import asyncio
import hashlib
import io
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import torch
from PIL import Image

from app.core.vector_config import vector_config
from app.utils.file_validator import file_validator, FileType

logger = logging.getLogger(__name__)

_runtime = None


def _get_runtime():
    global _runtime
    if _runtime is None:
        model_path = os.environ.get("LOCAL_EMBEDDING_MODEL_PATH", "/app/models/embedding")
        
        if not Path(model_path).exists():
            local_path = Path(__file__).resolve().parent.parent.parent.parent.parent / "models" / "embedding"
            if local_path.exists():
                model_path = str(local_path)
        
        logger.info(f"Loading Qwen3VL embedding model from: {model_path}")
        
        embedding_dir = Path(__file__).resolve().parent.parent.parent.parent / "embedding"
        if not embedding_dir.exists():
            embedding_dir = Path("/app/embedding")
        
        if embedding_dir.exists():
            import sys
            sys.path.insert(0, str(embedding_dir))
        
        try:
            from mm_vector_qwen3 import load_qwen3_vl_embedding
            
            device = os.environ.get("TORCH_DEVICE", "auto")
            if device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"
            
            logger.info(f"Using device: {device}")
            
            _runtime = load_qwen3_vl_embedding(
                model_path,
                device=device,
                instruction="Represent the user's input.",
                max_length=8192,
            )
            logger.info("Qwen3VL embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Qwen3VL model: {e}", exc_info=True)
            raise
    
    return _runtime


@dataclass
class EmbeddingResult:
    vector: List[float]
    dimension: int
    success: bool
    error: Optional[str] = None


class EmbeddingService:
    EMBEDDING_DIM = 1024

    def __init__(self):
        self._runtime = None

    def _ensure_runtime(self):
        if self._runtime is None:
            self._runtime = _get_runtime()

    def _preprocess_image(self, image: Union[str, bytes, Image.Image]) -> Image.Image:
        if isinstance(image, str):
            img = Image.open(image)
        elif isinstance(image, bytes):
            if len(image) < 2:
                raise ValueError("图片数据为空或过短，无法识别")
            
            header = image[:32]
            detected_type = file_validator.detect_file_type(header)
            
            if detected_type == FileType.SVG:
                img = self._svg_to_image(image)
            elif detected_type == FileType.UNKNOWN:
                snippet = image[:100]
                if snippet.strip().startswith(b'{') or snippet.strip().startswith(b'['):
                    raise ValueError(
                        "文件为 JSON 格式而非图片，无法进行图片向量化。"
                        "Excalidraw 文件需要先导出为图片预览才能向量化。"
                    )
                raise ValueError(
                    f"无法识别的图片格式（头部字节: {header[:8].hex()}），"
                    "支持 PNG/JPEG/GIF/WEBP/BMP/SVG 格式"
                )
            else:
                img = Image.open(io.BytesIO(image))
        else:
            img = image
        
        if img.mode == "RGBA":
            bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
            img = Image.alpha_composite(bg, img)
        img = img.convert("RGB")
        return img

    def _svg_to_image(self, svg_bytes: bytes) -> Image.Image:
        try:
            import cairosvg
            png_bytes = cairosvg.svg2png(bytestring=svg_bytes, output_width=512, output_height=512)
            return Image.open(io.BytesIO(png_bytes))
        except ImportError:
            raise ValueError(
                "SVG 格式需要安装 cairosvg 库才能转换。"
                "请运行: pip install cairosvg"
            )
        except Exception as e:
            raise ValueError(f"SVG 转图片失败: {e}")

    def _truncate_vector(self, vector: List[float], dim: int = 1024) -> List[float]:
        return vector[:dim]

    def encode_text_sync(self, text: str) -> EmbeddingResult:
        try:
            self._ensure_runtime()
            from mm_vector_qwen3 import embed_qwen3_vl, build_qwen_inputs_text
            
            inputs = build_qwen_inputs_text([text])
            with torch.no_grad():
                embeddings = embed_qwen3_vl(self._runtime, inputs)
            
            vec = self._truncate_vector(embeddings[0].tolist())
            return EmbeddingResult(
                vector=vec,
                dimension=len(vec),
                success=True,
            )
        except Exception as e:
            logger.error(f"Failed to embed text: {e}", exc_info=True)
            return EmbeddingResult(vector=[], dimension=0, success=False, error=str(e))

    def encode_image_sync(
        self, 
        image: Union[str, bytes, Image.Image],
        text: Optional[str] = None,
    ) -> EmbeddingResult:
        try:
            self._ensure_runtime()
            from mm_vector_qwen3 import embed_qwen3_vl
            
            img = self._preprocess_image(image)
            
            inputs = [{"image": img}]
            if text:
                inputs[0]["text"] = text
            
            with torch.no_grad():
                embeddings = embed_qwen3_vl(self._runtime, inputs)
            
            vec = self._truncate_vector(embeddings[0].tolist())
            return EmbeddingResult(
                vector=vec,
                dimension=len(vec),
                success=True,
            )
        except Exception as e:
            logger.error(f"Failed to embed image: {e}", exc_info=True)
            return EmbeddingResult(vector=[], dimension=0, success=False, error=str(e))

    def encode_images_batch_sync(
        self, 
        images: List[Union[str, bytes, Image.Image]],
        texts: Optional[List[str]] = None,
    ) -> EmbeddingResult:
        try:
            self._ensure_runtime()
            from mm_vector_qwen3 import embed_qwen3_vl
            
            inputs = []
            for i, image in enumerate(images):
                img = self._preprocess_image(image)
                inp: Dict[str, Any] = {"image": img}
                if texts and i < len(texts) and texts[i]:
                    inp["text"] = texts[i]
                inputs.append(inp)
            
            with torch.no_grad():
                embeddings = embed_qwen3_vl(self._runtime, inputs)
            
            vectors = [self._truncate_vector(v.tolist()) for v in embeddings]
            return EmbeddingResult(
                vector=vectors,
                dimension=self.EMBEDDING_DIM,
                success=True,
            )
        except Exception as e:
            logger.error(f"Failed to embed images batch: {e}", exc_info=True)
            return EmbeddingResult(vector=[], dimension=0, success=False, error=str(e))

    async def encode_text(self, text: str) -> EmbeddingResult:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.encode_text_sync, text)

    async def encode_image(
        self, 
        image: Union[str, bytes, Image.Image],
        text: Optional[str] = None,
    ) -> EmbeddingResult:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.encode_image_sync, image, text)

    async def encode_images_batch(
        self, 
        images: List[Union[str, bytes, Image.Image]],
        texts: Optional[List[str]] = None,
    ) -> EmbeddingResult:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.encode_images_batch_sync, images, texts)


embedding_service = EmbeddingService()
