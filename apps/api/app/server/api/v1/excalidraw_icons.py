
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.application.services.object_storage import storage_service
from app.core.config import settings


router = APIRouter()


class IconDeleteRequest(BaseModel):
    library_id: str
    item_index: int


class IconDeleteResponse(BaseModel):
    success: bool
    png_deleted: bool
    vector_removed: bool
    metadata_updated: bool
    errors: List[str]


@router.delete("/delete", response_model=IconDeleteResponse)
async def delete_icon(req: IconDeleteRequest):
    """
    删除预置图标
    
    删除指定的图标文件、向量索引和元数据
    """
    try:
        from app.application.services.excalidraw_icon_library import get_icon_library
        
        icon_library = get_icon_library()
        
        if not icon_library._loaded:
            await icon_library.load()
        
        if not icon_library._vectors_loaded:
            await icon_library.load_vectors()
        
        result = await icon_library.delete_icon(req.library_id, req.item_index)
        
        return IconDeleteResponse(
            success=result["success"],
            png_deleted=result["png_deleted"],
            vector_removed=result["vector_removed"],
            metadata_updated=result["metadata_updated"],
            errors=result["errors"],
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{path:path}")
async def get_icon(path: str):
    """从 RustFS 获取图标文件"""
    try:
        rustfs_path = f"excalidraw-icons/{path}"
        
        file_data = storage_service.try_download_file(
            rustfs_path,
            bucket=settings.RUSTFS_BUCKET_ASSETS
        )
        
        if file_data is None:
            raise HTTPException(status_code=404, detail="Icon not found")
        
        content_type = "image/png"
        if path.lower().endswith(".jpg") or path.lower().endswith(".jpeg"):
            content_type = "image/jpeg"
        elif path.lower().endswith(".gif"):
            content_type = "image/gif"
        elif path.lower().endswith(".svg"):
            content_type = "image/svg+xml"
        elif path.lower().endswith(".json"):
            content_type = "application/json"
        
        return Response(
            content=file_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
