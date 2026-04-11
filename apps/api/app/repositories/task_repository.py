from sqlalchemy.orm import Session
from app.domain.models.task import Task


class TaskRepository:
    @staticmethod
    def create(
        db: Session,
        task_type: str,
        input_payload: dict | None = None,
        project_id: int | None = None,
    ) -> Task:
        task = Task(
            project_id=project_id,
            task_type=task_type,
            status="queued",
            input_payload=input_payload or {},
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def get_by_id(db: Session, task_id: int):
        return db.query(Task).filter(Task.id == task_id).first()

    @staticmethod
    def list_tasks(
        db: Session,
        project_id: int | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ):
        query = db.query(Task)
        if project_id is not None:
            query = query.filter(Task.project_id == project_id)
        if status:
            query = query.filter(Task.status == status)

        total = query.count()
        items = (
            query.order_by(Task.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return {"total": total, "items": items, "page": page, "page_size": page_size}