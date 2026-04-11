import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.application.services.icon.database import icon_database
from app.application.services.icon.embedding import embedding_service
from app.application.services.icon.models import Icon, IconSearchResult, EmbeddingStatus
from app.application.services.object_storage import storage_service

logger = logging.getLogger(__name__)


class IconService:
    def __init__(self):
        self.database = icon_database
        self.embedding = embedding_service

    async def upload_icon(
        self,
        name: str,
        file_bytes: bytes,
        content_type: str,
        style: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source_file_path: Optional[str] = None,
        file_extension: str = ".png",
    ) -> Dict[str, Any]:
        icon_id = str(uuid.uuid4())
        safe_name = Path(name).stem if name else icon_id
        now = datetime.now()
        
        render_file_path = f"icons/uploads/{now.year}/{now.month:02d}/{now.day:02d}/{icon_id}_{safe_name}{file_extension}"
        
        url = storage_service.upload_file(
            file_bytes,
            render_file_path,
            content_type=content_type or "image/png",
            bucket=settings.RUSTFS_BUCKET_ASSETS,
        )
        
        db_id = await self.database.insert_icon(
            name=name or safe_name,
            render_file_path=render_file_path,
            style=style,
            source_file_path=source_file_path,
            tags_manual=tags or [],
        )
        
        logger.info(f"Icon uploaded: {db_id}, pending embedding")
        
        return {
            "id": db_id,
            "name": name or safe_name,
            "url": url,
            "render_file_path": render_file_path,
            "source_file_path": source_file_path,
            "style": style,
            "tags": tags or [],
            "embedding_status": EmbeddingStatus.PENDING.value,
            "status": "accepted",
        }

    async def search_by_text(
        self,
        query: str,
        top_k: int = 20,
    ) -> List[IconSearchResult]:
        embed_result = await self.embedding.encode_text(query)
        
        if not embed_result.success:
            logger.error(f"Failed to embed query: {embed_result.error}")
            return []
        
        rows = await self.database.search_by_vector(embed_result.vector, top_k=top_k)
        
        results: List[IconSearchResult] = []
        for row in rows:
            icon = Icon(
                id=str(row["id"]),
                name=row["name"] or "",
                render_file_path=row["render_file_path"] or "",
                style=row.get("style"),
                source_file_path=row.get("source_file_path"),
                tags_manual=list(row.get("tags_manual") or []),
            )
            results.append(IconSearchResult(
                icon=icon,
                similarity=float(row["similarity"]),
            ))
        
        return results

    async def search_by_image(
        self,
        image_bytes: bytes,
        top_k: int = 20,
    ) -> List[IconSearchResult]:
        embed_result = await self.embedding.encode_image(image_bytes)
        
        if not embed_result.success:
            logger.error(f"Failed to embed image: {embed_result.error}")
            return []
        
        rows = await self.database.search_by_vector(embed_result.vector, top_k=top_k)
        
        results: List[IconSearchResult] = []
        for row in rows:
            icon = Icon(
                id=str(row["id"]),
                name=row["name"] or "",
                render_file_path=row["render_file_path"] or "",
                style=row.get("style"),
                source_file_path=row.get("source_file_path"),
                tags_manual=list(row.get("tags_manual") or []),
            )
            results.append(IconSearchResult(
                icon=icon,
                similarity=float(row["similarity"]),
            ))
        
        return results

    async def get_icon(self, icon_id: str) -> Optional[Icon]:
        return await self.database.get_icon_by_id(icon_id)

    async def delete_icon(self, icon_id: str) -> bool:
        icon = await self.database.get_icon_by_id(icon_id)
        
        if icon is None:
            return False
        
        if icon.render_file_path:
            try:
                storage_service.delete_file(
                    icon.render_file_path,
                    bucket=settings.RUSTFS_BUCKET_ASSETS,
                )
            except Exception as e:
                logger.warning(f"Failed to delete render file: {e}")
        
        if icon.source_file_path:
            try:
                storage_service.delete_file(
                    icon.source_file_path,
                    bucket=settings.RUSTFS_BUCKET_ASSETS,
                )
            except Exception as e:
                logger.warning(f"Failed to delete source file: {e}")
        
        return await self.database.hard_delete_icon(icon_id)

    async def rename_icon(self, icon_id: str, new_name: str) -> Optional[Icon]:
        icon = await self.database.get_icon_by_id(icon_id)
        
        if icon is None:
            return None
        
        success = await self.database.rename_icon(icon_id, new_name)
        if not success:
            return None
        
        return await self.database.get_icon_by_id(icon_id)

    async def update_tags(self, icon_id: str, tags: List[str]) -> bool:
        return await self.database.update_tags(icon_id, tags)

    async def get_stats(self) -> Dict[str, int]:
        return await self.database.count_icons()

    def get_icon_url(self, render_file_path: str) -> str:
        return f"/api/v1/icons/file/{render_file_path}"


icon_service = IconService()
