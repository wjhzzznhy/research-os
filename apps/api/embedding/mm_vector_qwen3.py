import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

import torch
from PIL import Image

_scripts_dir = Path(__file__).resolve().parent
if _scripts_dir.exists():
    sys.path.insert(0, str(_scripts_dir))

from qwen3_vl_embedding import Qwen3VLEmbedder


def load_qwen3_vl_embedding(
    model_path: str,
    device: str = "auto",
    instruction: str = "Represent the user's input.",
    max_length: int = 8192,
    **kwargs
) -> Qwen3VLEmbedder:
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"

    torch_dtype = torch.float16 if device == "cuda" else torch.float32

    embedder = Qwen3VLEmbedder(
        model_name_or_path=model_path,
        max_length=max_length,
        default_instruction=instruction,
        torch_dtype=torch_dtype,
        **kwargs
    )

    if device == "cuda" and hasattr(embedder.model, 'to'):
        embedder.model = embedder.model.to(device)

    return embedder


def build_qwen_inputs_text(texts: List[str]) -> List[Dict[str, Any]]:
    return [{"text": text} for text in texts]


def build_qwen_inputs_image(
    images: List[Union[str, Image.Image]],
    texts: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    inputs = []
    for i, image in enumerate(images):
        inp: Dict[str, Any] = {"image": image}
        if texts and i < len(texts) and texts[i]:
            inp["text"] = texts[i]
        inputs.append(inp)
    return inputs


def embed_qwen3_vl(
    runtime: Qwen3VLEmbedder,
    inputs: List[Dict[str, Any]],
    normalize: bool = True
) -> torch.Tensor:
    return runtime.process(inputs, normalize=normalize)
