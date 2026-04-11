# app/server/api/v1/projects.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.server.deps import get_db
from app.common.response import success_response
from app.domain.schemas.project import ProjectCreateRequest, ProjectUpdateRequest
from app.application.services.project_service import ProjectService

router = APIRouter()

@router.get("", summary="获取项目列表")
def list_projects(request: Request, db: Session = Depends(get_db)):
    """
    输出参数:
    - project_id: 项目ID
    - name: 项目名称
    - description: 项目描述
    - status: 项目状态
    """
    items = ProjectService.list_projects(db)
    return success_response(
        data=[
            {
                "project_id": item.id,
                "name": item.name,
                "description": item.description,
                "status": item.status,
            }
            for item in items
        ],
        trace_id=request.state.trace_id,
    )

@router.post("", summary="创建项目")
def create_project(body: ProjectCreateRequest, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - name: 项目名称
    - description: 项目描述
    
    输出参数:
    - project_id: 项目ID
    - name: 项目名称
    - description: 项目描述
    - status: 项目状态
    """
    project = ProjectService.create_project(db, body.name, body.description)
    return success_response(
        data={
            "project_id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
        },
        trace_id=request.state.trace_id,
    )

@router.get("/{project_id}", summary="获取项目详情")
def get_project(project_id: int, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - project_id: 项目ID
    
    输出参数:
    - project_id: 项目ID
    - name: 项目名称
    - description: 项目描述
    - status: 项目状态
    """
    project = ProjectService.get_project(db, project_id)
    return success_response(
        data={
            "project_id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
        },
        trace_id=request.state.trace_id,
    )

@router.put("/{project_id}", summary="更新项目信息")
def update_project(project_id: int, body: ProjectUpdateRequest, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - project_id: 项目ID
    - name (可选): 项目名称
    - description (可选): 项目描述
    - status (可选): 项目状态
    
    输出参数:
    - project_id: 项目ID
    - name: 项目名称
    - description: 项目描述
    - status: 项目状态
    """
    project = ProjectService.update_project(db, project_id, body.model_dump(exclude_unset=True))
    return success_response(
        data={
            "project_id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
        },
        trace_id=request.state.trace_id,
    )