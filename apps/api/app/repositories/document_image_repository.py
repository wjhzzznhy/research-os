from sqlalchemy.orm import Session

from app.domain.models.document_image import DocumentImage


class DocumentImageRepository:
    @staticmethod
    def create_many(db: Session, images: list[DocumentImage]) -> list[DocumentImage]:
        if not images:
            return []
        db.add_all(images)
        db.flush()
        return images
