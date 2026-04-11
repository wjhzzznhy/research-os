# app/application/services/project_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.repositories.project_repository import ProjectRepository


class ProjectService:
    @staticmethod
    def create_project(db: Session, name: str, description: str | None = None):
        return ProjectRepository.create(db, name, description)

    @staticmethod
    def list_projects(db: Session):
        return ProjectRepository.list_all(db)

    @staticmethod
    def get_project(db: Session, project_id: int):
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise BizException(40402, "project not found", 404)
        return project

    @staticmethod
    def update_project(db: Session, project_id: int, data: dict):
        project = ProjectService.get_project(db, project_id)
        return ProjectRepository.update(db, project, data)