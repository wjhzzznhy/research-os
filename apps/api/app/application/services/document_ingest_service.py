# app/application/services/document_ingest_service.py
import hashlib
import os
import re
import shutil

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.application.services.pdf_parse_service import PDFParseService
from app.application.services.storage_service import StorageService
from app.common.exceptions import BizException
from app.domain.models.document_chunk import DocumentChunk
from app.domain.models.document_image import DocumentImage
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.repositories.document_image_repository import DocumentImageRepository
from app.repositories.document_repository import DocumentRepository
from app.application.services.artifact_service import ArtifactService

class DocumentIngestService:
    IMAGE_MARKDOWN_PATTERN = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<path>[^)]+)\)")

    @staticmethod
    def ingest_artifact_pdf(db: Session, artifact_id: int) -> dict:
        # 1. 先通过 Artifact ID 拿到物理文件信息
        artifact = ArtifactService.get_artifact(db, artifact_id)
        if not artifact.file_name.lower().endswith(".pdf"):
            raise BizException(40004, "Only PDF files can be parsed", 400)

        # 2. 计算 Hash（防重复）
        with open(artifact.storage_path, "rb") as f:
            file_bytes = f.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        existing_document = DocumentRepository.get_by_file_hash(db, file_hash)
        if existing_document:
            artifact.document_id = str(existing_document.id)
            db.commit()
            return {"document_id": str(existing_document.id), "msg": "already parsed"}

        # 3. 准备 MinerU 输出目录
        output_dir = StorageService.build_output_dir(prefix="mineru")

        try:
            # 4. 创建 Document 记录，并关联 Artifact ID
            document = DocumentRepository.create(
                db=db,
                filename=artifact.file_name,
                file_hash=file_hash,
            )
            markdown_text = PDFParseService.parse_pdf_markdown(
                pdf_path=artifact.storage_path,
                output_dir=output_dir,
            )
            discovered_images = DocumentIngestService.find_images_in_output(output_dir=output_dir)
            copied_filenames = DocumentIngestService.copy_images_to_media(
                image_files=discovered_images,
                document_id=str(document.id),
            )
            markdown_text, image_urls = DocumentIngestService.rewrite_markdown_image_paths(
                markdown_text=markdown_text,
                document_id=str(document.id),
                available_filenames=copied_filenames,
            )
            chunk_payloads = DocumentIngestService.split_markdown(markdown_text)
            chunks = [
                DocumentChunk(
                    document_id=document.id,
                    chapter=payload["chapter"],
                    title=payload["title"],
                    content=payload["content"],
                    chunk_index=index,
                )
                for index, payload in enumerate(chunk_payloads)
            ]
            DocumentChunkRepository.create_many(db, chunks)
            image_url_to_chunk_id: dict[str, object] = {}
            for chunk in chunks:
                for image_url in DocumentIngestService.extract_media_urls(chunk.content):
                    if image_url not in image_url_to_chunk_id:
                        image_url_to_chunk_id[image_url] = chunk.id
            if image_urls:
                images = [
                    DocumentImage(
                        document_id=document.id,
                        chunk_id=image_url_to_chunk_id.get(image_url),
                        file_url=image_url,
                    )
                    for image_url in image_urls
                ]
                DocumentImageRepository.create_many(db, images)
            artifact.document_id = str(document.id)
            db.commit()
            db.refresh(document)
        except Exception:
            db.rollback()
            # StorageService.delete_path(saved["storage_path"])
            raise
        finally:
            StorageService.delete_dir(output_dir)

        return {
            "document_id": str(document.id),
            "filename": document.filename,
            "file_hash": document.file_hash,
            "chunk_count": len(chunks),
            "image_count": len(image_urls),
            "chunks_preview": [
                {
                    "chunk_index": chunk.chunk_index,
                    "chapter": chunk.chapter,
                    "title": chunk.title,
                    "content": chunk.content,
                }
                for chunk in chunks[:10]
            ],
        }

    @staticmethod
    def find_images_in_output(output_dir: str) -> dict[str, str]:
        image_files: dict[str, str] = {}
        for root, _, files in os.walk(output_dir):
            if os.path.basename(root).lower() != "images":
                continue
            for file_name in files:
                if not file_name.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
                    continue
                image_files[file_name] = os.path.join(root, file_name)
        return image_files

    @staticmethod
    def copy_images_to_media(image_files: dict[str, str], document_id: str) -> set[str]:
        if not image_files:
            return set()
        media_target = StorageService.build_document_media_dir(document_id=document_id)
        copied_filenames: set[str] = set()
        for file_name, source_path in image_files.items():
            target_path = os.path.join(media_target, file_name)
            shutil.copy2(source_path, target_path)
            copied_filenames.add(file_name)
        return copied_filenames

    @staticmethod
    def rewrite_markdown_image_paths(
        markdown_text: str,
        document_id: str,
        available_filenames: set[str],
    ) -> tuple[str, list[str]]:
        matched_urls: list[str] = []

        def replace(match: re.Match) -> str:
            alt_text = match.group("alt")
            original_path = (match.group("path") or "").strip().strip("<>")
            raw_path = original_path.split()[0] if original_path else ""
            normalized_path = raw_path.replace("\\", "/")
            if not normalized_path:
                return match.group(0)
            if normalized_path.startswith(("http://", "https://", "/media/")):
                return match.group(0)
            if "images/" not in normalized_path and not normalized_path.startswith("./images/"):
                return match.group(0)
            base_path = normalized_path.split("?", 1)[0].split("#", 1)[0]
            file_name = os.path.basename(base_path)
            if file_name not in available_filenames:
                return match.group(0)
            media_url = f"/media/{document_id}/{file_name}"
            if media_url not in matched_urls:
                matched_urls.append(media_url)
            return f"![{alt_text}]({media_url})"

        rewritten_markdown = DocumentIngestService.IMAGE_MARKDOWN_PATTERN.sub(replace, markdown_text)
        return rewritten_markdown, matched_urls

    @staticmethod
    def extract_media_urls(markdown_text: str) -> list[str]:
        urls: list[str] = []
        for match in DocumentIngestService.IMAGE_MARKDOWN_PATTERN.finditer(markdown_text or ""):
            raw_path = (match.group("path") or "").strip().strip("<>")
            media_url = raw_path.split()[0] if raw_path else ""
            if media_url.startswith("/media/") and media_url not in urls:
                urls.append(media_url)
        return urls

    @staticmethod
    def split_markdown(markdown_text: str) -> list[dict]:
        cleaned_text = (markdown_text or "").strip()
        if not cleaned_text:
            raise ValueError("MinerU未返回可切分的文本内容")

        heading_pattern = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
        chunks: list[dict] = []
        current_chapter: str | None = None
        current_title: str | None = None
        current_lines: list[str] = []

        def flush_chunk():
            content = "\n".join(current_lines).strip()
            if current_title is None and not content:
                return
            chunks.append(
                {
                    "chapter": current_chapter,
                    "title": current_title,
                    "content": content,
                }
            )

        for line in cleaned_text.splitlines():
            matched = heading_pattern.match(line.strip())
            if matched:
                flush_chunk()
                level = len(matched.group(1))
                heading_text = matched.group(2).strip()
                if level == 1:
                    current_chapter = heading_text
                current_title = heading_text
                current_lines = []
                continue
            current_lines.append(line)

        flush_chunk()
        if chunks:
            return chunks

        return [
            {
                "chapter": None,
                "title": None,
                "content": cleaned_text,
            }
        ]
