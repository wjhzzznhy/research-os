import uuid
import time
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.application.services.object_storage import storage_service
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class MaterialAsset(BaseModel):
    id: str
    name: str
    url: str
    kind: Optional[str] = None
    preview_url: Optional[str] = None
    tags: list[str] = []
    category: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    index_status: Optional[str] = None
    index_error: Optional[str] = None
    metadata: dict = {}


def _get_public_base_url() -> str:
    public_endpoint = (settings.RUSTFS_PUBLIC_ENDPOINT or "").strip()
    if public_endpoint:
        if public_endpoint.startswith("http://") or public_endpoint.startswith("https://"):
            return public_endpoint.rstrip("/")
        protocol = "https" if settings.RUSTFS_SECURE else "http"
        return f"{protocol}://{public_endpoint}".rstrip("/")
    return ""


def _detect_content_type(filename: str) -> str:
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    content_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml",
        "pdf": "application/pdf",
        "json": "application/json",
        "excalidraw": "application/json",
        "excalidrawlib": "application/json",
    }
    return content_types.get(ext, "application/octet-stream")


@router.post("/upload", response_model=MaterialAsset)
async def upload_material(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(default="general"),
    tags: str = Form(default=""),
    source: str = Form(default=""),
    description: str = Form(default=""),
):
    try:
        material_id = str(uuid.uuid4())
        file_content = await file.read()
        
        ext = ""
        if file.filename and "." in file.filename:
            ext = "." + file.filename.split(".")[-1]
        
        object_name = f"materials/{category}/{material_id}{ext}"
        
        content_type = _detect_content_type(file.filename or "")
        
        url = storage_service.upload_file(
            file_data=file_content,
            file_name=object_name,
            content_type=content_type,
            bucket=settings.RUSTFS_BUCKET_ASSETS,
        )
        
        base_url = _get_public_base_url()
        if base_url and not url.startswith("http"):
            url = f"{base_url}/{settings.RUSTFS_BUCKET_ASSETS}/{object_name}"
        
        now_ms = int(time.time() * 1000)
        
        return MaterialAsset(
            id=material_id,
            name=name,
            url=url,
            kind="image" if content_type.startswith("image/") else "file",
            tags=tags.split(",") if tags else [],
            category=category,
            description=description,
            status="uploaded",
            metadata={
                "source": source,
                "original_filename": file.filename,
                "content_type": content_type,
                "size": len(file_content),
                "created_at": now_ms,
            },
        )
        
    except Exception as e:
        logger.error(f"Failed to upload material: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/upload-excalidraw-file", response_model=MaterialAsset)
async def upload_excalidraw_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form(default="excalidraw-file"),
    tags: str = Form(default=""),
    source: str = Form(default=""),
    description: str = Form(default=""),
    preview: Optional[UploadFile] = File(default=None),
):
    try:
        material_id = str(uuid.uuid4())
        file_content = await file.read()
        
        ext = ""
        if file.filename and "." in file.filename:
            ext = "." + file.filename.split(".")[-1]
        
        object_name = f"materials/{category}/{material_id}{ext}"
        
        content_type = _detect_content_type(file.filename or "")
        
        url = storage_service.upload_file(
            file_data=file_content,
            file_name=object_name,
            content_type=content_type,
            bucket=settings.RUSTFS_BUCKET_ASSETS,
        )
        
        preview_url = None
        if preview:
            preview_content = await preview.read()
            preview_object_name = f"materials/{category}/{material_id}_preview.png"
            preview_url = storage_service.upload_file(
                file_data=preview_content,
                file_name=preview_object_name,
                content_type="image/png",
                bucket=settings.RUSTFS_BUCKET_ASSETS,
            )
        
        base_url = _get_public_base_url()
        if base_url:
            if not url.startswith("http"):
                url = f"{base_url}/{settings.RUSTFS_BUCKET_ASSETS}/{object_name}"
            if preview_url and not preview_url.startswith("http"):
                preview_url = f"{base_url}/{settings.RUSTFS_BUCKET_ASSETS}/{preview_object_name}"
        
        now_ms = int(time.time() * 1000)
        
        return MaterialAsset(
            id=material_id,
            name=name,
            url=url,
            kind="excalidraw",
            preview_url=preview_url,
            tags=tags.split(",") if tags else [],
            category=category,
            description=description,
            status="uploaded",
            metadata={
                "source": source,
                "original_filename": file.filename,
                "content_type": content_type,
                "size": len(file_content),
                "created_at": now_ms,
            },
        )
        
    except Exception as e:
        logger.error(f"Failed to upload excalidraw file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.delete("/{material_id}")
async def delete_material(material_id: str):
    try:
        deleted = storage_service.delete_file(
            file_name=f"materials/{material_id}",
            bucket=settings.RUSTFS_BUCKET_ASSETS,
        )
        
        return {
            "id": material_id,
            "deleted": deleted,
        }
        
    except Exception as e:
        logger.error(f"Failed to delete material: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
