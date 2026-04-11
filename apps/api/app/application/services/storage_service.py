import os
import shutil
from uuid import uuid4
from fastapi import UploadFile
from app.core.config import settings


class StorageService:
    @staticmethod
    def ensure_dirs():
        os.makedirs(os.path.join(settings.STORAGE_BASE, "uploads"), exist_ok=True)
        os.makedirs(os.path.join(settings.STORAGE_BASE, "outputs"), exist_ok=True)

    @staticmethod
    def save_upload(file: UploadFile) -> dict:
        file_bytes = file.file.read()
        return StorageService.save_bytes(
            file_bytes=file_bytes,
            original_filename=file.filename or "",
            content_type=file.content_type,
        )

    @staticmethod
    def save_bytes(file_bytes: bytes, original_filename: str, content_type: str | None = None) -> dict:
        StorageService.ensure_dirs()
        ext = os.path.splitext(original_filename or "")[1]
        unique_name = f"{uuid4().hex}{ext}"
        full_path = os.path.join(settings.STORAGE_BASE, "uploads", unique_name)

        with open(full_path, "wb") as f:
            f.write(file_bytes)

        size = os.path.getsize(full_path)
        return {
            "file_name": original_filename or unique_name,
            "storage_path": full_path,
            "content_type": content_type,
            "file_size": size,
        }

    @staticmethod
    def resolve_path(storage_path: str) -> str:
        return storage_path

    @staticmethod
    def build_output_dir(prefix: str = "output") -> str:
        StorageService.ensure_dirs()
        output_dir = os.path.join(settings.STORAGE_BASE, "outputs", f"{prefix}_{uuid4().hex}")
        os.makedirs(output_dir, exist_ok=True)
        return output_dir

    @staticmethod
    def delete_path(path: str | None):
        if path and os.path.isfile(path):
            os.remove(path)

    @staticmethod
    def delete_dir(path: str | None):
        if path and os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)

    @staticmethod
    def ensure_media_root() -> str:
        media_root = settings.MEDIA_BASE or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data", "media",
        )
        os.makedirs(media_root, exist_ok=True)
        return media_root

    @staticmethod
    def build_document_media_dir(document_id: str) -> str:
        media_root = StorageService.ensure_media_root()
        target_dir = os.path.join(media_root, document_id)
        os.makedirs(target_dir, exist_ok=True)
        return target_dir
