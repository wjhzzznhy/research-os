import io
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile
from PIL import Image
from pydantic import BaseModel

from app.application.services.icon import icon_service, icon_embedding_worker
from app.application.services.icon.database import icon_database
from app.application.services.icon.embedding import embedding_service
from app.application.services.icon.models import EmbeddingStatus
from app.application.services.object_storage import storage_service
from app.core.config import settings
from app.utils.file_validator import FileType, FileValidator

router = APIRouter()
logger = logging.getLogger(__name__)

icon_file_validator = FileValidator(
    max_file_size=20 * 1024 * 1024,
    allowed_types=[FileType.PNG, FileType.JPEG, FileType.GIF, FileType.WEBP, FileType.BMP, FileType.SVG],
    strip_metadata=False,
)


class IconResponse(BaseModel):
    id: str
    name: str
    url: str
    style: Optional[str] = None
    tags: List[str] = []
    embedding_status: str
    similarity: Optional[float] = None
    source_file_url: Optional[str] = None


class IconSearchResponse(BaseModel):
    icons: List[IconResponse]
    total: int


class IconStatsResponse(BaseModel):
    total: int
    pending: int
    processing: int
    completed: int
    failed: int
    active: int


class TagsUpdateRequest(BaseModel):
    tags: List[str]


class NameUpdateRequest(BaseModel):
    name: str


def _build_icon_url(render_file_path: str) -> str:
    return f"/api/v1/icons/file/{render_file_path}"


def _build_source_file_url(source_file_path: Optional[str]) -> Optional[str]:
    if not source_file_path:
        return None
    return f"/api/v1/icons/file/{source_file_path}"


@router.post("/upload", response_model=IconResponse, status_code=202)
async def upload_icon(
    file: UploadFile = File(...),
    name: str = Form(""),
    style: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    source_file: Optional[UploadFile] = File(None),
):
    try:
        content = await file.read()
        
        parsed_tags: List[str] = []
        if tags:
            parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]
        
        filename = file.filename or ""
        is_excalidraw_file = (
            filename.lower().endswith('.excalidraw') or 
            filename.lower().endswith('.excalidrawlib') or
            (source_file and (source_file.filename or '').lower().endswith('.excalidraw'))
        )
        
        validation = icon_file_validator.validate_upload(
            content,
            declared_content_type=file.content_type,
            sanitize=False,
        )
        
        if not validation.is_valid:
            if is_excalidraw_file:
                raise HTTPException(
                    status_code=400,
                    detail=f"Excalidraw 文件预览图无效，无法进行向量化：{validation.error_message}。请确保 Excalidraw 文件能正常导出为图片预览。",
                )
            raise HTTPException(
                status_code=400,
                detail=f"上传的文件不是有效的图片格式：{validation.error_message}",
            )
        
        upload_style = style
        upload_content_type = validation.mime_type
        source_file_path = None
        
        if source_file and is_excalidraw_file:
            source_content = await source_file.read()
            now = datetime.now()
            source_id = str(uuid.uuid4())
            safe_source_name = Path(source_file.filename or 'source.excalidraw').stem
            source_file_path = f"icons/sources/{now.year}/{now.month:02d}/{now.day:02d}/{source_id}_{safe_source_name}.excalidraw"
            
            storage_service.upload_file(
                source_content,
                source_file_path,
                content_type="application/json",
                bucket=settings.RUSTFS_BUCKET_ASSETS,
            )
            logger.info(f"Stored Excalidraw source file: {source_file_path}")
        
        if is_excalidraw_file and not upload_style:
            upload_style = 'excalidraw-file'
        
        ext_map = {
            FileType.PNG: ".png",
            FileType.JPEG: ".jpg",
            FileType.GIF: ".gif",
            FileType.WEBP: ".webp",
            FileType.BMP: ".bmp",
            FileType.SVG: ".svg",
        }
        detected_ext = ext_map.get(validation.file_type, ".png")
        
        result = await icon_service.upload_icon(
            name=name or source_file.filename if source_file else file.filename or "icon",
            file_bytes=content,
            content_type=upload_content_type,
            style=upload_style,
            tags=parsed_tags,
            source_file_path=source_file_path,
            file_extension=detected_ext,
        )
        
        return IconResponse(
            id=result["id"],
            name=result["name"],
            url=result["url"],
            style=result.get("style"),
            tags=result.get("tags", []),
            embedding_status=result["embedding_status"],
            source_file_url=_build_source_file_url(result.get("source_file_path")),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Icon upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"图标上传失败: {e}")


@router.get("/search/text", response_model=IconSearchResponse)
async def search_icons_by_text(
    q: str = Query(..., description="搜索关键词"),
    top_k: int = Query(20, ge=1, le=100, description="返回结果数量"),
):
    try:
        results = await icon_service.search_by_text(q, top_k=top_k)
        
        icons = [
            IconResponse(
                id=r.icon.id,
                name=r.icon.name,
                url=_build_icon_url(r.icon.render_file_path),
                style=r.icon.style,
                tags=r.icon.tags_manual,
                embedding_status="completed",
                similarity=r.similarity,
                source_file_url=_build_source_file_url(r.icon.source_file_path),
            )
            for r in results
        ]
        
        return IconSearchResponse(icons=icons, total=len(icons))
    except Exception as e:
        logger.error(f"Text search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"搜索失败: {e}")


@router.post("/search/image", response_model=IconSearchResponse)
async def search_icons_by_image(
    file: UploadFile = File(...),
    top_k: int = Form(20),
):
    try:
        content = await file.read()
        results = await icon_service.search_by_image(content, top_k=top_k)
        
        icons = [
            IconResponse(
                id=r.icon.id,
                name=r.icon.name,
                url=_build_icon_url(r.icon.render_file_path),
                style=r.icon.style,
                tags=r.icon.tags_manual,
                embedding_status="completed",
                similarity=r.similarity,
                source_file_url=_build_source_file_url(r.icon.source_file_path),
            )
            for r in results
        ]
        
        return IconSearchResponse(icons=icons, total=len(icons))
    except Exception as e:
        logger.error(f"Image search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"图片搜索失败: {e}")


@router.get("/{icon_id}", response_model=IconResponse)
async def get_icon(icon_id: str):
    icon = await icon_service.get_icon(icon_id)
    
    if icon is None:
        raise HTTPException(status_code=404, detail="图标不存在")
    
    return IconResponse(
        id=icon.id,
        name=icon.name,
        url=_build_icon_url(icon.render_file_path),
        style=icon.style,
        tags=icon.tags_manual,
        embedding_status=icon.embedding_status.value,
        source_file_url=_build_source_file_url(icon.source_file_path),
    )


@router.delete("/{icon_id}")
async def delete_icon(icon_id: str):
    success = await icon_service.delete_icon(icon_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="图标不存在")
    
    return {"success": True, "message": "图标已删除"}


@router.patch("/{icon_id}/tags", response_model=IconResponse)
async def update_icon_tags(icon_id: str, request: TagsUpdateRequest):
    icon = await icon_service.get_icon(icon_id)
    
    if icon is None:
        raise HTTPException(status_code=404, detail="图标不存在")
    
    await icon_service.update_tags(icon_id, request.tags)
    
    updated_icon = await icon_service.get_icon(icon_id)
    
    return IconResponse(
        id=updated_icon.id,
        name=updated_icon.name,
        url=_build_icon_url(updated_icon.render_file_path),
        style=updated_icon.style,
        tags=request.tags,
        embedding_status=updated_icon.embedding_status.value,
        source_file_url=_build_source_file_url(updated_icon.source_file_path),
    )


@router.patch("/{icon_id}/name", response_model=IconResponse)
async def rename_icon(icon_id: str, request: NameUpdateRequest):
    new_name = request.name.strip()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="图标名称不能为空")
    
    updated_icon = await icon_service.rename_icon(icon_id, new_name)
    
    if updated_icon is None:
        raise HTTPException(status_code=404, detail="图标不存在或改名失败")
    
    return IconResponse(
        id=updated_icon.id,
        name=updated_icon.name,
        url=_build_icon_url(updated_icon.render_file_path),
        style=updated_icon.style,
        tags=updated_icon.tags_manual,
        embedding_status=updated_icon.embedding_status.value,
        source_file_url=_build_source_file_url(updated_icon.source_file_path),
    )


@router.get("/stats/overview", response_model=IconStatsResponse)
async def get_icon_stats():
    stats = await icon_service.get_stats()
    return IconStatsResponse(**stats)


@router.get("/file/{path:path}")
async def get_icon_file(path: str):
    try:
        file_data = storage_service.try_download_file(
            path,
            bucket=settings.RUSTFS_BUCKET_ASSETS,
        )
        
        if file_data is None:
            raise HTTPException(status_code=404, detail="图标文件不存在")
        
        content_type = "image/png"
        if path.lower().endswith(".jpg") or path.lower().endswith(".jpeg"):
            content_type = "image/jpeg"
        elif path.lower().endswith(".gif"):
            content_type = "image/gif"
        elif path.lower().endswith(".svg"):
            content_type = "image/svg+xml"
        elif path.lower().endswith(".webp"):
            content_type = "image/webp"
        elif path.lower().endswith(".excalidraw") or path.lower().endswith(".excalidrawlib"):
            content_type = "application/json"
        elif path.lower().endswith(".json"):
            content_type = "application/json"
        
        return Response(
            content=file_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get icon file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
