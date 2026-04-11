from sqlalchemy.orm import Session
from app.domain.models.project import Project


class ProjectRepository:
    @staticmethod
    def create(db: Session, name: str, description: str | None = None) -> Project:
        project = Project(name=name, description=description, status="active")
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def list_all(db: Session):
        return db.query(Project).order_by(Project.id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, project_id: int):
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def update(db: Session, project: Project, data: dict) -> Project:
        for key, value in data.items():
            if value is not None:
                setattr(project, key, value)
        db.commit()
        db.refresh(project)
        return project