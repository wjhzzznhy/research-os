import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.server.api.router import api_router
from app.server.middleware.trace_middleware import TraceMiddleware
from app.common.exceptions import register_exception_handlers
from app.application.services.storage_service import StorageService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _run_startup_warmup() -> None:
    try:
        from app.application.services.icon.embedding import embedding_service

        result = embedding_service.encode_text_sync("database icon")
        if not result.success:
            raise RuntimeError(result.error or "Embedding warmup failed")
        logger.info(f"   Embedding: 已预热，维度={result.dimension}")
    except Exception as e:
        logger.warning(f"⚠️ 预热失败 (首次搜索可能会较慢): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("🚀 ResearchOS API 启动中...")
    logger.info("=" * 60)

    warmup_enabled = settings.WARMUP_ON_STARTUP
    warmup_task: asyncio.Task | None = None

    if warmup_enabled:
        logger.info("🔥 开始预热模型...")
        warmup_task = asyncio.create_task(_run_startup_warmup())
    else:
        logger.info("⏭️ 跳过预热 (WARMUP_ON_STARTUP=False)")

    try:
        from app.application.services.icon import icon_embedding_worker, icon_database
        await icon_database.ensure_schema()
        await icon_embedding_worker.start()
        logger.info("   Icon Embedding Worker: 已启动")
    except Exception as worker_error:
        logger.warning(f"⚠️ Icon Embedding Worker 启动失败: {worker_error}")

    try:
        from app.core.database import sync_engine
        from app.domain.models import Base

        Base.metadata.create_all(bind=sync_engine)
        logger.info("   Database Schema: 已检查")
    except Exception as schema_error:
        logger.warning(f"⚠️ Database Schema 检查失败: {schema_error}")

    logger.info("=" * 60)
    logger.info("✅ ResearchOS API 已就绪!")
    logger.info("=" * 60)

    yield

    try:
        from app.application.services.icon import icon_embedding_worker
        await icon_embedding_worker.stop()
        logger.info("   Icon Embedding Worker: 已停止")
    except Exception:
        pass

    if warmup_task and not warmup_task.done():
        warmup_task.cancel()
        try:
            await warmup_task
        except asyncio.CancelledError:
            pass

    logger.info("🛑 ResearchOS API 关闭中...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="3.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(TraceMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_STR)

try:
    media_dir = StorageService.ensure_media_root()
    app.mount("/media", StaticFiles(directory=media_dir), name="media")
except Exception:
    pass


@app.get("/")
async def root():
    return {"message": "Welcome to ResearchOS API", "docs": "/docs"}
