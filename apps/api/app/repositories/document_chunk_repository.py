from uuid import UUID

from sqlalchemy.orm import Session

from app.domain.models.document_chunk import DocumentChunk


class DocumentChunkRepository:
    @staticmethod
    def create_many(db: Session, chunks: list[DocumentChunk]) -> list[DocumentChunk]:
        db.add_all(chunks)
        db.flush()
        return chunks

    @staticmethod
    def list_by_document_id(
        db: Session,
        document_id: UUID,
        limit: int = 200,
        offset: int = 0,
    ) -> list[DocumentChunk]:
        return (
            db.query(DocumentChunk)
            .filter(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
