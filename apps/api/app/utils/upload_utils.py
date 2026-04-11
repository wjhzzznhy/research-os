import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile

from app.core.upload_config import upload_config
from app.utils.file_validator import FileType, ValidationResult, file_validator

logger = logging.getLogger(__name__)


@dataclass
class SecureUploadResult:
    content: bytes
    size: int
    file_type: FileType
    mime_type: str
    metadata: Optional[dict] = None


async def validate_upload_file(
    file: UploadFile,
    allowed_types: Optional[list] = None,
    allowed_extensions: Optional[list] = None,
    max_size: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    max_size = max_size or upload_config.MAX_FILE_SIZE
    allowed_types = allowed_types or upload_config.ALLOWED_IMAGE_TYPES + upload_config.ALLOWED_DOCUMENT_TYPES
    allowed_extensions = allowed_extensions or upload_config.ALLOWED_EXTENSIONS
    
    filename = file.filename or ""
    
    if not allowed_types:
        allowed_types = []
    if not allowed_extensions:
        allowed_extensions = []
    
    content_type = file.content_type or ""
    content_type_lower = content_type.lower()
    
    type_valid = False
    if content_type_lower:
        for allowed in allowed_types:
            if content_type_lower.startswith(allowed) or content_type_lower == allowed:
                type_valid = True
                break
    
    if not type_valid and allowed_extensions:
        filename_lower = filename.lower()
        for ext in allowed_extensions:
            if filename_lower.endswith(ext):
                type_valid = True
                break
    
    if not type_valid and (allowed_types or allowed_extensions):
        return False, f"不支持的文件类型: {content_type}"
    
    return True, None


async def stream_upload_file(
    file: UploadFile,
    max_size: Optional[int] = None,
) -> Tuple[bytes, int]:
    max_size = max_size or upload_config.MAX_FILE_SIZE
    chunk_size = upload_config.CHUNK_SIZE
    
    content = bytearray()
    total_size = 0
    
    logger.info(f"开始流式读取文件: {file.filename}")
    
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        
        chunk_len = len(chunk)
        total_size += chunk_len
        
        if total_size > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"文件大小超过限制 (最大 {max_size / (1024*1024):.1f}MB)"
            )
        
        content.extend(chunk)
        logger.debug(f"已读取: {total_size / (1024*1024):.2f}MB")
    
    logger.info(f"文件读取完成，总大小: {total_size / (1024*1024):.2f}MB")
    return bytes(content), total_size


async def secure_upload_file(
    file: UploadFile,
    max_size: Optional[int] = None,
    sanitize: bool = True,
) -> SecureUploadResult:
    max_size = max_size or upload_config.MAX_FILE_SIZE
    
    content, size = await stream_upload_file(file, max_size=max_size)
    
    validation_result: ValidationResult = file_validator.validate_upload(
        content=content,
        declared_content_type=file.content_type,
        declared_size=size,
        sanitize=sanitize,
    )
    
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=400,
            detail=validation_result.error_message or "文件验证失败",
        )
    
    final_content = validation_result.sanitized_content or content
    
    logger.info(
        f"Secure upload validated: type={validation_result.file_type.value}, "
        f"size={len(final_content)}, sanitized={sanitize}"
    )
    
    return SecureUploadResult(
        content=final_content,
        size=len(final_content),
        file_type=validation_result.file_type,
        mime_type=validation_result.mime_type,
        metadata=validation_result.metadata,
    )


def get_file_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def sanitize_filename(filename: str) -> str:
    import re
    filename = Path(filename).name
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = filename.strip()
    return filename or "unnamed_file"
