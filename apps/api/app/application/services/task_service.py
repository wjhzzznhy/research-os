# app/application/services/task_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.repositories.task_repository import TaskRepository
from app.repositories.project_repository import ProjectRepository


class TaskService:
    @staticmethod
    def create_task(
        db: Session,
        task_type: str,
        input_payload: dict | None = None,
        project_id: int | None = None,
    ):
        if project_id == 0:
            project_id = None
        if project_id is not None:
            project = ProjectRepository.get_by_id(db, project_id)
            if not project:
                raise BizException(40402, "project not found", 404)

        return TaskRepository.create(
            db=db,
            task_type=task_type,
            input_payload=input_payload,
            project_id=project_id,
        )

    @staticmethod
    def get_task_by_id(db: Session, task_id: int):
        task = TaskRepository.get_by_id(db, task_id)
        if not task:
            raise BizException(40401, "task not found", 404)
        return task

    @staticmethod
    def list_tasks(
        db: Session,
        project_id: int | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ):
        return TaskRepository.list_tasks(db, project_id, status, page, page_size)