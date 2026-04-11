from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.application.services.object_storage import storage_service


class ExcalidrawMaterialsManifest:
    def __init__(self):
        self.bucket = settings.RUSTFS_BUCKET_ASSETS
        self.key = "materials/excalidraw-scenes.json"

    def _load(self) -> List[Dict[str, Any]]:
        blob = storage_service.try_download_file(self.key, bucket=self.bucket)
        if not blob:
            return []
        try:
            data = json.loads(blob.decode("utf-8"))
        except Exception:
            return []
        if not isinstance(data, list):
            return []
        return [x for x in data if isinstance(x, dict)]

    def _save(self, items: List[Dict[str, Any]]) -> None:
        storage_service.upload_file(
            json.dumps(items, ensure_ascii=False).encode("utf-8"),
            self.key,
            content_type="application/json",
            bucket=self.bucket,
        )

    def list(self, *, limit: int = 200) -> List[Dict[str, Any]]:
        items = self._load()
        items.sort(key=lambda x: int(x.get("updated") or x.get("created") or 0), reverse=True)
        return items[: max(1, min(int(limit), 2000))]

    def get(self, scene_id: str) -> Optional[Dict[str, Any]]:
        scene_id = (scene_id or "").strip()
        if not scene_id:
            return None
        for it in self._load():
            if str(it.get("scene_id") or "") == scene_id:
                return it
        return None

    def upsert(self, scene_id: str, entry: Dict[str, Any]) -> Dict[str, Any]:
        scene_id = (scene_id or "").strip()
        if not scene_id:
            raise ValueError("scene_id is required")

        now_ms = int(time.time() * 1000)
        items = self._load()
        next_items: List[Dict[str, Any]] = []
        existing: Optional[Dict[str, Any]] = None

        for it in items:
            if str(it.get("scene_id") or "") == scene_id:
                existing = it
            else:
                next_items.append(it)

        merged = dict(existing or {})
        merged.update(entry or {})
        merged["scene_id"] = scene_id
        merged["updated"] = now_ms
        if "created" not in merged:
            merged["created"] = now_ms
        next_items.append(merged)
        self._save(next_items)
        return merged

    def mark_deleted(self, scene_id: str, deleted: bool = True) -> Optional[Dict[str, Any]]:
        scene_id = (scene_id or "").strip()
        if not scene_id:
            return None

        now_ms = int(time.time() * 1000)
        items = self._load()
        changed = False
        for it in items:
            if str(it.get("scene_id") or "") == scene_id:
                it["deleted"] = bool(deleted)
                it["updated"] = now_ms
                changed = True
                break
        if changed:
            self._save(items)
        return self.get(scene_id)


excalidraw_materials_manifest = ExcalidrawMaterialsManifest()

