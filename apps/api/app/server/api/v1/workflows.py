# app/server/api/v1/workflows.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.server.deps import get_db
from app.domain.schemas.workflow import WorkflowCreate, WorkflowUpdate
from app.common.response import success_response
from app.application.services.workflow_service import WorkflowService

router = APIRouter()

@router.get("", summary="获取工作流列表")
def list_workflows(request: Request, category: str | None = None, db: Session = Depends(get_db)):
    """
    分类拉取系统中所有可用的工作流模板（可按 category 过滤）：

    输入参数:
    - category (可选): 工作流类别，用于筛选
    
    输出参数:
    - workflow_id: 工作流ID
    - name: 工作流名称
    - description: 工作流描述
    - category: 工作流类别
    - graph_config: 工作流图配置
    - created_at: 创建时间
    """
    res = WorkflowService.list(db, category)
    return success_response(
        data=[
            {
                "workflow_id": item.id,
                "name": item.name,
                "description": item.description,
                "category": item.category,
                "is_system": item.is_system,
                "graph_config": item.graph_config
            } for item in res
        ],
        trace_id=request.state.trace_id
    )

@router.post("", summary="创建工作流图纸")
def create_workflow(request: Request,workflow: WorkflowCreate, db: Session = Depends(get_db)):
    """
    接收前端可视化编排生成的 JSON 数据，保存为新的工作流模板。

    输入参数:
    - name: 工作流名称
    - description: 工作流描述
    - category: 工作流类别
    - graph_config: 工作流图配置
    
    输出参数:
    - workflow_id: 工作流ID
    - name: 工作流名称
    - description: 工作流描述
    - category: 工作流类别
    - graph_config: 工作流图配置
    - created_at: 创建时间
    """
    res = WorkflowService.create(db, workflow)
    return success_response(
        data={
            "workflow_id": res.id,
            "name": res.name,
            "description": res.description,
            "category": res.category,
            "is_system": res.is_system,
            "graph_config": res.graph_config
        },
        trace_id=request.state.trace_id
    )

@router.get("/{workflow_id}", summary="获取单张工作流图纸")
def get_workflow(request: Request, workflow_id: str, db: Session = Depends(get_db)):
    """
    拉取特定工作流的完整 JSON Graph Config 数据。

    输入参数:
    - workflow_id: 工作流ID
    
    输出参数:
    - workflow_id: 工作流ID
    - name: 工作流名称
    - description: 工作流描述
    - category: 工作流类别
    - graph_config: 工作流图配置
    - created_at: 创建时间
    """
    res = WorkflowService.get(db, workflow_id)
    return success_response(
        data={
            "workflow_id": res.id,
            "name": res.name,
            "description": res.description,
            "category": res.category,
            "is_system": res.is_system,
            "graph_config": res.graph_config
        },
        trace_id=request.state.trace_id
    )

@router.put("/{workflow_id}", summary="更新工作流图纸")
def update_workflow(request: Request, workflow_id: str, workflow: WorkflowUpdate, db: Session = Depends(get_db)):
    """
    用新的 JSON 拓扑图覆盖原有的工作流配置。

    输入参数:
    - workflow_id: 工作流ID
    - name (可选): 工作流名称
    - description (可选): 工作流描述
    - category (可选): 工作流类别
    - graph_config (可选): 工作流图配置
    
    输出参数:
    - workflow_id: 工作流ID
    - name: 工作流名称
    - description: 工作流描述
    - category: 工作流类别
    - graph_config: 工作流图配置
    - created_at: 创建时间
    """
    res = WorkflowService.update(db, workflow_id, workflow)
    return success_response(
        data={
            "workflow_id": res.id,
            "name": res.name,
            "description": res.description,
            "category": res.category,
            "is_system": res.is_system,
            "graph_config": res.graph_config
        },
        trace_id=request.state.trace_id
    )

@router.delete("/{workflow_id}", summary="删除工作流图纸")
def delete_workflow(request: Request, workflow_id: str, db: Session = Depends(get_db)):
    """
    输入参数:
    - workflow_id: 工作流ID
    """
    WorkflowService.delete(db, workflow_id)
    return success_response(data={"message": "Workflow deleted"}, trace_id=request.state.trace_id)
