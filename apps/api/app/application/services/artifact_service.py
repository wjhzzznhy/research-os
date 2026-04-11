# app/application/services/artifact_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.repositories.artifact_repository import ArtifactRepository
from app.repositories.task_repository import TaskRepository


class ArtifactService:
    @staticmethod
    def create_artifact(
        db: Session,
        file_name: str,
        storage_path: str,
        content_type: str | None = None,
        file_size: int | None = None,
        category: str = "input",
        task_id: int | None = None,
        project_id: int | None = None,
        document_id: str | None = None,
    ):
        if task_id is not None:
            task = TaskRepository.get_by_id(db, task_id)
            if not task:
                raise BizException(40401, "task not found", 404)

        return ArtifactRepository.create(
            db=db,
            file_name=file_name,
            storage_path=storage_path,
            content_type=content_type,
            file_size=file_size,
            category=category,
            task_id=task_id,
            project_id=project_id,
            document_id=document_id,
        )

    @staticmethod
    def get_artifact(db: Session, artifact_id: int):
        artifact = ArtifactRepository.get_by_id(db, artifact_id)
        if not artifact:
            raise BizException(40403, "artifact not found", 404)
        return artifact

    @staticmethod
    def list_by_task(db: Session, task_id: int):
        return ArtifactRepository.list_by_task(db, task_id)