from sqlalchemy.orm import Session
from app.domain.models.artifact import Artifact


class ArtifactRepository:
    @staticmethod
    def create(
        db: Session,
        file_name: str,
        storage_path: str,
        content_type: str | None = None,
        file_size: int | None = None,
        category: str = "input",
        task_id: int | None = None,
        project_id: int | None = None,
        document_id: str | None = None,
    ) -> Artifact:
        artifact = Artifact(
            project_id=project_id,
            task_id=task_id,
            category=category,
            file_name=file_name,
            storage_path=storage_path,
            content_type=content_type,
            file_size=file_size,
            document_id=document_id,
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)
        return artifact

    @staticmethod
    def get_by_id(db: Session, artifact_id: int):
        return db.query(Artifact).filter(Artifact.id == artifact_id).first()

    @staticmethod
    def list_by_task(db: Session, task_id: int):
        return db.query(Artifact).filter(Artifact.task_id == task_id).order_by(Artifact.id.asc()).all()