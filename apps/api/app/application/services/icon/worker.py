import asyncio
import logging
from datetime import datetime
from typing import Optional

from app.application.services.icon.database import icon_database
from app.application.services.icon.embedding import embedding_service
from app.application.services.icon.models import Icon, EmbeddingStatus
from app.application.services.object_storage import storage_service
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRY_COUNT = 3
BATCH_SIZE = 20
POLL_INTERVAL = 5


class IconEmbeddingWorker:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._process_loop())
        logger.info("Icon embedding worker started")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Icon embedding worker stopped")

    async def _process_loop(self) -> None:
        while self._running:
            try:
                await self._process_batch()
            except Exception as e:
                logger.error(f"Error in embedding worker: {e}", exc_info=True)
            
            await asyncio.sleep(POLL_INTERVAL)

    async def _process_batch(self) -> None:
        icons = await icon_database.get_pending_icons(limit=BATCH_SIZE)
        
        if not icons:
            return
        
        logger.info(f"Processing {len(icons)} icons for embedding")
        
        for icon in icons:
            try:
                await self._process_single_icon(icon)
            except Exception as e:
                logger.error(f"Failed to process icon {icon.id}: {e}", exc_info=True)
                await self._handle_failure(icon, str(e))

    async def _process_single_icon(self, icon: Icon) -> None:
        image_bytes = await self._load_image(icon.render_file_path)
        
        if image_bytes is None:
            await self._handle_failure(icon, f"Failed to load image: {icon.render_file_path}")
            return
        
        result = await embedding_service.encode_image(image_bytes)
        
        if not result.success:
            await self._handle_failure(icon, result.error or "Unknown embedding error")
            return
        
        await icon_database.update_embedding(
            icon_id=icon.id,
            embedding=result.vector,
            status=EmbeddingStatus.COMPLETED,
        )
        
        logger.info(f"Successfully embedded icon {icon.id}")

    async def _load_image(self, render_file_path: str) -> Optional[bytes]:
        try:
            if render_file_path.startswith("http://") or render_file_path.startswith("https://"):
                import httpx
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(render_file_path)
                    response.raise_for_status()
                    return response.content
            
            return storage_service.try_download_file(
                render_file_path,
                bucket=settings.RUSTFS_BUCKET_ASSETS,
            )
        except Exception as e:
            logger.error(f"Failed to load image from {render_file_path}: {e}")
            return None

    async def _handle_failure(self, icon: Icon, error: str) -> None:
        new_retry_count = icon.retry_count + 1
        
        await icon_database.mark_embedding_failed(
            icon_id=icon.id,
            error=error,
            retry_count=new_retry_count,
            max_retries=MAX_RETRY_COUNT,
        )
        
        if new_retry_count >= MAX_RETRY_COUNT:
            logger.error(f"Icon {icon.id} permanently failed after {new_retry_count} retries")
        else:
            logger.warning(f"Icon {icon.id} failed, will retry (attempt {new_retry_count}/{MAX_RETRY_COUNT})")


icon_embedding_worker = IconEmbeddingWorker()
