# app/repositories/document_repository.py
from sqlalchemy.orm import Session

from app.domain.models.document import Document


class DocumentRepository:
    @staticmethod
    def get_by_file_hash(db: Session, file_hash: str) -> Document | None:
        return db.query(Document).filter(Document.file_hash == file_hash).first()

    @staticmethod
    def create(db: Session, filename: str, file_hash: str) -> Document: 
        document = Document(
            filename=filename,
            file_hash=file_hash,
        )
        db.add(document)
        db.flush()
        return document
