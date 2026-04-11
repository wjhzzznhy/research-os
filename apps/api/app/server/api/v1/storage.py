from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.application.services.object_storage import storage_service
from app.core.config import settings

router = APIRouter()


def _iter_minio_response(minio_response, chunk_size: int = 1024 * 512):
    try:
        for chunk in minio_response.stream(chunk_size):
            if chunk:
                yield chunk
    finally:
        try:
            minio_response.close()
        except Exception:
            pass
        try:
            minio_response.release_conn()
        except Exception:
            pass


@router.get("/assets/{object_name:path}")
def get_asset(object_name: str):
    client = storage_service._get_client()
    if not client:
        raise HTTPException(status_code=503, detail="Storage service is not available")

    try:
        stat = client.stat_object(settings.RUSTFS_BUCKET_ASSETS, object_name)
        minio_response = client.get_object(settings.RUSTFS_BUCKET_ASSETS, object_name)
        return StreamingResponse(
            _iter_minio_response(minio_response),
            media_type=getattr(stat, "content_type", None) or "application/octet-stream",
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/papers/{object_name:path}")
def get_paper(object_name: str):
    client = storage_service._get_client()
    if not client:
        raise HTTPException(status_code=503, detail="Storage service is not available")

    try:
        stat = client.stat_object(settings.RUSTFS_BUCKET_PAPERS, object_name)
        minio_response = client.get_object(settings.RUSTFS_BUCKET_PAPERS, object_name)
        return StreamingResponse(
            _iter_minio_response(minio_response),
            media_type=getattr(stat, "content_type", None) or "application/octet-stream",
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

