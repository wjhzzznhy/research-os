# app/application/services/workflow_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.domain.models.workflow import Workflow
from app.domain.schemas.workflow import WorkflowCreate, WorkflowUpdate
import uuid

class WorkflowService:
    @staticmethod   
    def create(db: Session, workflow_data: WorkflowCreate) -> Workflow:
        new_id = workflow_data.id
        if not new_id or new_id == "string":
            new_id = uuid.uuid4().hex

        db_workflow = Workflow(
            id=new_id,
            name=workflow_data.name,
            description=workflow_data.description,
            category=workflow_data.category,
            graph_config=workflow_data.graph_config,
            is_system=workflow_data.is_system
        )
        db.add(db_workflow)
        db.commit()
        db.refresh(db_workflow)
        return db_workflow

    @staticmethod
    def get(db: Session, workflow_id: str) -> Workflow:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise BizException(40401, f"工作流图纸 {workflow_id} 不存在", 404)
        return workflow

    @staticmethod
    def update(db: Session, workflow_id: str, workflow_data: WorkflowUpdate) -> Workflow:
        db_workflow = WorkflowService.get(db, workflow_id)
        
        # 保护系统预置图纸不被乱改
        if db_workflow.is_system and workflow_data.graph_config is not None:
            raise BizException(40302, "系统预置图纸，默认不允许修改结构", 403)
            
        update_data = workflow_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_workflow, key, value)
            
        db.commit()
        db.refresh(db_workflow)
        return db_workflow

    @staticmethod
    def delete(db: Session, workflow_id: str):
        db_workflow = WorkflowService.get(db, workflow_id)
        if db_workflow.is_system:
            raise BizException(40303, "系统预置工作流不允许删除", 403)
            
        db.delete(db_workflow)
        db.commit()
        return True

    @staticmethod
    def list(db: Session, category: str | None = None):
        query = db.query(Workflow)
        if category:
            query = query.filter(Workflow.category == category)
        return query.order_by(Workflow.created_at.desc()).all()
