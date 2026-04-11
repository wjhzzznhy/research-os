from __future__ import annotations

import asyncio
import io
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

tutorials_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "tutorials" / "multimodal-vector-search"
sys.path.insert(0, str(tutorials_dir))

from app.application.services.excalidraw_visual_embedder import (
    ExcalidrawVisualEmbedder,
    ExcalidrawVisualReranker,
    VisualEmbeddingResult,
    get_visual_embedder,
    get_visual_reranker,
)

try:
    from mm_vector_ocr import extract_text_easyocr, join_spans, OcrSpan
    OCR_AVAILABLE = True
except Exception as e:
    print(f"OCR not available: {e}")
    OCR_AVAILABLE = False


@dataclass
class IconMetadata:
    library_id: str
    library_name: str
    library_description: Optional[str]
    item_index: int
    item_name: Optional[str]
    item_id: Optional[str]
    png_path: Path
    metadata_path: Path
    ocr_text: Optional[str] = None


@dataclass
class IconSearchResult:
    icon: IconMetadata
    score: float
    rerank_score: Optional[float] = None


class ExcalidrawIconLibrary:
    def __init__(
        self,
        *,
        data_dir: str | Path,
        embedder: Optional[ExcalidrawVisualEmbedder] = None,
        reranker: Optional[ExcalidrawVisualReranker] = None,
        vector_cache_dir: str | Path | None = None,
    ):
        self.data_dir = Path(data_dir)
        self.embedder = embedder or get_visual_embedder()
        self.reranker = reranker or get_visual_reranker()
        self.vector_cache_dir = (
            Path(vector_cache_dir) if vector_cache_dir else self.data_dir / "_icon_vectors"
        )
        self.icons: List[IconMetadata] = []
        self._icon_vectors: Dict[str, List[float]] = {}
        self._icon_keys: List[str] = []
        self._vector_matrix: Optional[np.ndarray] = None
        self._loaded = False
        self._vectors_loaded = False

    async def load(self) -> None:
        if self._loaded:
            return

        print(f"正在加载图标库: {self.data_dir}")

        for lib_dir in sorted(self.data_dir.iterdir()):
            if not lib_dir.is_dir():
                continue

            metadata_path = lib_dir / "metadata.json"
            if not metadata_path.exists():
                continue

            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    lib_meta = json.load(f)

                library_id = lib_meta.get("library_id", lib_dir.name)
                library_name = lib_meta.get("name", library_id)
                library_description = lib_meta.get("description")
                items = lib_meta.get("items", [])

                for item in items:
                    item_index = item.get("index", 0)
                    item_name = item.get("name")
                    item_id = item.get("id")

                    safe_name = self._sanitize_name(item_name or "None")
                    png_path = lib_dir / f"{item_index:03d}_{safe_name}.png"

                    if not png_path.exists():
                        safe_name = self._sanitize_name(item_name or f"item_{item_index}")
                        png_path = lib_dir / f"{item_index:03d}_{safe_name}.png"

                    if not png_path.exists():
                        safe_name = "None"
                        png_path = lib_dir / f"{item_index:03d}_{safe_name}.png"

                    if png_path.exists():
                        icon_meta = IconMetadata(
                            library_id=library_id,
                            library_name=library_name,
                            library_description=library_description,
                            item_index=item_index,
                            item_name=item_name,
                            item_id=item_id,
                            png_path=png_path,
                            metadata_path=metadata_path,
                        )
                        self.icons.append(icon_meta)

            except Exception as e:
                print(f"跳过 {lib_dir.name}: {e}")

        print(f"成功加载 {len(self.icons)} 个图标")
        self._loaded = True

    def _sanitize_name(self, name: str) -> str:
        invalid_chars = '<>:"/\\|?*'
        for c in invalid_chars:
            name = name.replace(c, "_")
        return name.strip() or "unnamed"

    async def vectorize_all(self, *, force_revectorize: bool = False, use_ocr: bool = True, batch_size: int = 10) -> None:
        if not self._loaded:
            await self.load()

        if not force_revectorize:
            loaded = await self.load_vectors()
            if loaded and len(self._icon_vectors) >= len(self.icons):
                print("使用缓存的向量")
                return

        print(f"正在向量化 {len(self.icons)} 个图标...")

        ocr_texts: Dict[str, str] = {}
        
        if use_ocr and OCR_AVAILABLE:
            print("  正在进行OCR文字识别...")
            try:
                images_to_ocr = []
                icon_keys = []
                
                for icon in self.icons:
                    try:
                        img = Image.open(icon.png_path)
                        images_to_ocr.append(img)
                        icon_keys.append(f"{icon.library_id}:{icon.item_index}")
                    except Exception as e:
                        print(f"    跳过OCR {icon.png_path.name}: {e}")
                
                if images_to_ocr:
                    ocr_results = extract_text_easyocr(
                        images_to_ocr,
                        langs=["en", "ch_sim"],
                        min_conf=0.5,
                    )
                    
                    for icon_key, spans in zip(icon_keys, ocr_results):
                        ocr_text = join_spans(spans)
                        if ocr_text:
                            ocr_texts[icon_key] = ocr_text
                    
            except Exception as e:
                print(f"  OCR识别失败: {e}")
                import traceback
                traceback.print_exc()

        icons_to_process = [
            icon for icon in self.icons
            if f"{icon.library_id}:{icon.item_index}" not in self._icon_vectors
        ]

        print(f"需要处理 {len(icons_to_process)} 个新图标")

        for batch_start in range(0, len(icons_to_process), batch_size):
            batch = icons_to_process[batch_start:batch_start + batch_size]
            batch_end = min(batch_start + batch_size, len(icons_to_process))
            print(f"  处理进度: {batch_end}/{len(icons_to_process)}")

            tasks = []
            for icon in batch:
                tasks.append(self._vectorize_single_icon(icon, ocr_texts))

            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for icon, result in zip(batch, results):
                icon_key = f"{icon.library_id}:{icon.item_index}"
                if isinstance(result, Exception):
                    print(f"  ✗ {icon.png_path.name}: 向量化失败 - {result}")
                elif result is not None:
                    self._icon_vectors[icon_key] = result

        print(f"向量化完成: {len(self._icon_vectors)} 个图标")

        self._build_vector_matrix()

        await self.save_vectors()

    def _build_vector_matrix(self) -> None:
        if not self._icon_vectors:
            self._icon_keys = []
            self._vector_matrix = None
            return

        self._icon_keys = list(self._icon_vectors.keys())
        vectors = [self._icon_vectors[key] for key in self._icon_keys]
        self._vector_matrix = np.array(vectors, dtype=np.float32)

    async def _vectorize_single_icon(self, icon: IconMetadata, ocr_texts: Dict[str, str]) -> Optional[List[float]]:
        icon_key = f"{icon.library_id}:{icon.item_index}"
        try:
            with open(icon.png_path, "rb") as f:
                image_bytes = f.read()

            text_parts = []
            if icon.library_name:
                text_parts.append(icon.library_name)
            if icon.library_description:
                text_parts.append(icon.library_description)
            if icon.item_name:
                text_parts.append(icon.item_name)
            if icon_key in ocr_texts:
                text_parts.append(ocr_texts[icon_key])
                icon.ocr_text = ocr_texts[icon_key]

            combined_text = " ".join(text_parts) if text_parts else ""
            
            if combined_text.strip():
                img_result = await self.embedder.embed_image_and_text(image_bytes, combined_text)
            else:
                img_result = await self.embedder.embed_image_bytes(image_bytes)
                
            if img_result.success:
                return img_result.vector
            else:
                raise Exception(img_result.error)
        except Exception as e:
            raise e

    async def save_vectors(self) -> None:
        if not self._icon_vectors:
            print("没有向量可保存")
            return

        self.vector_cache_dir.mkdir(parents=True, exist_ok=True)

        vectors_npy_file = self.vector_cache_dir / "icon_vectors.npz"
        keys_file = self.vector_cache_dir / "icon_keys.json"
        metadata_file = self.vector_cache_dir / "icon_metadata.json"

        self._icon_keys = list(self._icon_vectors.keys())
        vectors_matrix = np.array([self._icon_vectors[k] for k in self._icon_keys], dtype=np.float32)

        np.savez_compressed(vectors_npy_file, vectors=vectors_matrix)

        with open(keys_file, "w", encoding="utf-8") as f:
            json.dump(self._icon_keys, f, ensure_ascii=False)

        metadata_data = {
            "version": "2.0",
            "format": "npz",
            "icons": [
                {
                    "library_id": icon.library_id,
                    "library_name": icon.library_name,
                    "library_description": icon.library_description,
                    "item_index": icon.item_index,
                    "item_name": icon.item_name,
                    "item_id": icon.item_id,
                    "png_path": str(icon.png_path.relative_to(self.data_dir)),
                    "metadata_path": str(icon.metadata_path.relative_to(self.data_dir)),
                    "ocr_text": icon.ocr_text,
                }
                for icon in self.icons
            ],
        }

        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(metadata_data, f, ensure_ascii=False, indent=2)

        print(f"向量已保存到: {self.vector_cache_dir} (NPZ 格式)")

    async def load_vectors(self) -> bool:
        if self._vectors_loaded:
            return True

        vectors_npy_file = self.vector_cache_dir / "icon_vectors.npz"
        keys_file = self.vector_cache_dir / "icon_keys.json"
        metadata_file = self.vector_cache_dir / "icon_metadata.json"
        vectors_json_file = self.vector_cache_dir / "icon_vectors.json"

        use_npz = vectors_npy_file.exists() and keys_file.exists() and metadata_file.exists()
        use_json = vectors_json_file.exists() and metadata_file.exists()

        if not use_npz and not use_json:
            print("向量缓存文件不存在，需要重新向量化")
            return False

        try:
            if use_npz:
                print("加载 NPZ 格式向量缓存...")
                data = np.load(vectors_npy_file)
                self._vector_matrix = data["vectors"]

                with open(keys_file, "r", encoding="utf-8") as f:
                    self._icon_keys = json.load(f)

                self._icon_vectors = {}
                for i, key in enumerate(self._icon_keys):
                    self._icon_vectors[key] = self._vector_matrix[i].tolist()
            else:
                print("加载 JSON 格式向量缓存 (旧格式，建议重新生成)...")
                with open(vectors_json_file, "r", encoding="utf-8") as f:
                    vectors_data = json.load(f)
                self._icon_vectors = vectors_data.get("vectors", {})
                self._build_vector_matrix()

            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata_data = json.load(f)

            loaded_icons = []
            for icon_data in metadata_data.get("icons", []):
                icon_meta = IconMetadata(
                    library_id=icon_data["library_id"],
                    library_name=icon_data["library_name"],
                    library_description=icon_data.get("library_description"),
                    item_index=icon_data["item_index"],
                    item_name=icon_data.get("item_name"),
                    item_id=icon_data.get("item_id"),
                    png_path=self.data_dir / icon_data["png_path"],
                    metadata_path=self.data_dir / icon_data["metadata_path"],
                    ocr_text=icon_data.get("ocr_text"),
                )
                loaded_icons.append(icon_meta)

            self.icons = loaded_icons
            self._vectors_loaded = True
            self._loaded = True

            if not use_npz:
                self._build_vector_matrix()

            print(f"已加载 {len(self._icon_vectors)} 个向量")
            return True

        except Exception as e:
            print(f"加载向量缓存失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def search_by_text(
        self,
        query: str,
        *,
        top_k: int = 20,
        use_rerank: bool = True,
    ) -> List[IconSearchResult]:
        if not self._loaded:
            await self.load()

        if not self._icon_vectors:
            await self.vectorize_all()

        text_result = await self.embedder.embed_text(query)
        if not text_result.success:
            return []

        query_vec = text_result.vector
        results = self._search_by_vector(query_vec, top_k=top_k * 2 if use_rerank else top_k)

        if use_rerank:
            results = await self._rerank(query, results, top_k=top_k)

        return results

    async def search_by_image(
        self,
        image_bytes: bytes,
        *,
        top_k: int = 20,
        use_rerank: bool = True,
    ) -> List[IconSearchResult]:
        if not self._loaded:
            await self.load()

        if not self._icon_vectors:
            await self.vectorize_all()

        img_result = await self.embedder.embed_image_bytes(image_bytes)
        if not img_result.success:
            return []

        query_vec = img_result.vector
        results = self._search_by_vector(query_vec, top_k=top_k * 2 if use_rerank else top_k)

        if use_rerank:
            results = await self._rerank_by_image(image_bytes, results, top_k=top_k)

        return results

    def _search_by_vector(
        self,
        query_vec: List[float],
        *,
        top_k: int = 20,
    ) -> List[IconSearchResult]:
        if self._vector_matrix is None or len(self._icon_keys) == 0:
            return []

        q = np.array(query_vec, dtype=np.float32)
        
        q_norm = np.linalg.norm(q)
        if q_norm > 0:
            q_normalized = q / q_norm
        else:
            q_normalized = q
        
        matrix_norms = np.linalg.norm(self._vector_matrix, axis=1, keepdims=True)
        matrix_norms[matrix_norms == 0] = 1
        matrix_normalized = self._vector_matrix / matrix_norms
        
        cosine_similarity = np.dot(matrix_normalized, q_normalized)
        scores = np.clip(cosine_similarity, 0.0, 1.0)

        top_indices = np.argsort(scores)[::-1][:top_k]

        icon_key_to_icon = {
            f"{icon.library_id}:{icon.item_index}": icon
            for icon in self.icons
        }

        results = []
        for idx in top_indices:
            icon_key = self._icon_keys[idx]
            icon = icon_key_to_icon.get(icon_key)
            if icon:
                results.append(IconSearchResult(icon=icon, score=float(scores[idx])))

        return results

    def _build_rerank_candidates(self, results: List[IconSearchResult]) -> List[Dict[str, Any]]:
        candidates = []
        for result in results:
            icon = result.icon
            text_parts = []
            if icon.library_name:
                text_parts.append(icon.library_name)
            if icon.library_description:
                text_parts.append(icon.library_description)
            if icon.item_name:
                text_parts.append(icon.item_name)
            if icon.ocr_text:
                text_parts.append(icon.ocr_text)
            combined_text = " ".join(text_parts) if text_parts else ""

            with open(icon.png_path, "rb") as f:
                img_bytes = f.read()
            img = Image.open(io.BytesIO(img_bytes))

            candidates.append({"text": combined_text, "image": img})
        return candidates

    def _process_rerank_results(
        self,
        results: List[IconSearchResult],
        rerank_scores: List[float],
        top_k: int,
    ) -> List[IconSearchResult]:
        scored_results = []
        for i, result in enumerate(results):
            scored_result = IconSearchResult(
                icon=result.icon,
                score=result.score,
                rerank_score=rerank_scores[i],
            )
            scored_results.append(scored_result)

        scored_results.sort(
            key=lambda x: x.rerank_score if x.rerank_score is not None else x.score,
            reverse=True
        )
        return scored_results[:top_k]

    async def _rerank(
        self,
        query: str,
        results: List[IconSearchResult],
        *,
        top_k: int = 20,
    ) -> List[IconSearchResult]:
        try:
            candidates = self._build_rerank_candidates(results)
            rerank_result = await self.reranker.rerank_text_query(query, candidates)
            if not rerank_result.success:
                print(f"Rerank failed: {rerank_result.error}")
                return results[:top_k]

            return self._process_rerank_results(results, rerank_result.scores, top_k)
        except Exception as e:
            print(f"Rerank error: {e}")
            return results[:top_k]

    async def _rerank_by_image(
        self,
        image_bytes: bytes,
        results: List[IconSearchResult],
        *,
        top_k: int = 20,
    ) -> List[IconSearchResult]:
        try:
            query_img = Image.open(io.BytesIO(image_bytes))
            candidates = self._build_rerank_candidates(results)
            rerank_result = await self.reranker.rerank_image_query(query_img, candidates)
            if not rerank_result.success:
                print(f"Rerank failed: {rerank_result.error}")
                return results[:top_k]

            return self._process_rerank_results(results, rerank_result.scores, top_k)
        except Exception as e:
            print(f"Rerank error: {e}")
            return results[:top_k]

    async def delete_icon(self, library_id: str, item_index: int) -> Dict[str, Any]:
        """
        删除指定图标
        
        同步删除：
        1. PNG 图片文件
        2. 向量索引缓存
        3. metadata.json 元数据
        4. BM25 搜索索引
        """
        result = {
            "success": False,
            "png_deleted": False,
            "vector_removed": False,
            "metadata_updated": False,
            "bm25_updated": False,
            "errors": [],
        }
        
        icon_key = f"{library_id}:{item_index}"
        icon_to_delete = None
        for icon in self.icons:
            if icon.library_id == library_id and icon.item_index == item_index:
                icon_to_delete = icon
                break
        
        if icon_to_delete is None:
            result["errors"].append(f"Icon not found: {icon_key}")
            return result
        
        try:
            if icon_to_delete.png_path.exists():
                icon_to_delete.png_path.unlink()
                result["png_deleted"] = True
                print(f"Deleted PNG file: {icon_to_delete.png_path}")
            else:
                result["errors"].append(f"PNG file not found: {icon_to_delete.png_path}")
        except Exception as e:
            result["errors"].append(f"Failed to delete PNG file: {e}")
        
        if icon_key in self._icon_vectors:
            del self._icon_vectors[icon_key]
            result["vector_removed"] = True
            
            if icon_key in self._icon_keys:
                self._icon_keys.remove(icon_key)
            
            self._build_vector_matrix()
        
        self.icons = [
            icon for icon in self.icons
            if not (icon.library_id == library_id and icon.item_index == item_index)
        ]
        
        try:
            await self._update_library_metadata(library_id, item_index)
            result["metadata_updated"] = True
        except Exception as e:
            result["errors"].append(f"Failed to update metadata: {e}")
        
        try:
            await self.save_vectors()
        except Exception as e:
            result["errors"].append(f"Failed to save vectors: {e}")
        
        try:
            self._remove_from_bm25_index(icon_key)
            result["bm25_updated"] = True
        except Exception as e:
            result["errors"].append(f"Failed to update BM25 index: {e}")
        
        result["success"] = (
            result["png_deleted"] and 
            result["vector_removed"] and 
            result["metadata_updated"] and
            result["bm25_updated"]
        )
        
        return result
    
    def _remove_from_bm25_index(self, icon_key: str) -> None:
        """从 BM25 索引中移除已删除的图标"""
        try:
            from app.application.services.enterprise_icon_search import _enterprise_search_service
            
            if _enterprise_search_service is None:
                return
            
            bm25 = _enterprise_search_service.bm25_retriever
            
            if icon_key in bm25.index.doc_contents:
                del bm25.index.doc_contents[icon_key]
            
            if icon_key in bm25.index.doc_lengths:
                del bm25.index.doc_lengths[icon_key]
            
            if icon_key in bm25.index.doc_metadata:
                del bm25.index.doc_metadata[icon_key]
            
            for token in list(bm25.index.term_doc_counts.keys()):
                if icon_key in bm25.index.term_doc_counts[token]:
                    del bm25.index.term_doc_counts[token][icon_key]
                    bm25.index.doc_freqs[token] -= 1
                    if bm25.index.doc_freqs[token] <= 0:
                        del bm25.index.doc_freqs[token]
                        del bm25.index.term_doc_counts[token]
            
            bm25.index.num_docs = len(bm25.index.doc_lengths)
            if bm25.index.num_docs > 0:
                bm25.index.avg_doc_len = sum(bm25.index.doc_lengths.values()) / bm25.index.num_docs
            
            if icon_key in _enterprise_search_service._doc_id_to_icon:
                del _enterprise_search_service._doc_id_to_icon[icon_key]
            
            print(f"Updated BM25 index, removed icon: {icon_key}")
        except Exception as e:
            print(f"Warning: Failed to update BM25 index: {e}")
    
    async def _update_library_metadata(self, library_id: str, deleted_item_index: int) -> None:
        """更新库的 metadata.json，移除已删除的图标项"""
        for lib_dir in sorted(self.data_dir.iterdir()):
            if not lib_dir.is_dir():
                continue
            
            metadata_path = lib_dir / "metadata.json"
            if not metadata_path.exists():
                continue
            
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    lib_meta = json.load(f)
                
                if lib_meta.get("library_id") != library_id:
                    continue
                
                items = lib_meta.get("items", [])
                original_count = len(items)
                lib_meta["items"] = [
                    item for item in items
                    if item.get("index") != deleted_item_index
                ]
                
                if len(lib_meta["items"]) < original_count:
                    with open(metadata_path, "w", encoding="utf-8") as f:
                        json.dump(lib_meta, f, ensure_ascii=False, indent=2)
                    print(f"Updated metadata for library {library_id}")
                
                break
            except Exception as e:
                print(f"Failed to update metadata for {lib_dir.name}: {e}")
                raise


_icon_library: Optional[ExcalidrawIconLibrary] = None


def get_icon_library(
    data_dir: Optional[str | Path] = None,
) -> ExcalidrawIconLibrary:
    global _icon_library
    if _icon_library is not None:
        return _icon_library

    if data_dir is None:
        data_dir = Path(__file__).resolve().parent.parent.parent / "excalidraw_all_with_description"

    _icon_library = ExcalidrawIconLibrary(data_dir=data_dir)
    return _icon_library
