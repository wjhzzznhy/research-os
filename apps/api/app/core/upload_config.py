from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class UploadConfig(BaseSettings):
    MAX_FILE_SIZE: int = Field(100 * 1024 * 1024, description="最大文件大小 (bytes)")
    CHUNK_SIZE: int = Field(1024 * 1024, description="流式读取块大小 (bytes)")
    ALLOWED_IMAGE_TYPES: List[str] = Field(
        default_factory=lambda: ["image/png", "image/jpeg", "image/gif", "image/svg+xml"]
    )
    ALLOWED_DOCUMENT_TYPES: List[str] = Field(
        default_factory=lambda: ["application/pdf", "text/plain"]
    )
    ALLOWED_EXTENSIONS: List[str] = Field(
        default_factory=lambda: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".pdf", ".txt"]
    )
    
    class Config:
        env_prefix = "UPLOAD_"

upload_config = UploadConfig()
