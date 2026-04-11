# app/server/api/v1/tasks.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.server.deps import get_db
from app.common.response import success_response
from app.domain.schemas.task import TaskCreateRequest
from app.application.services.task_service import TaskService
from app.application.services.artifact_service import ArtifactService
from app.workers.task_jobs import run_task_job

router = APIRouter()


@router.post("", summary="创建（异步）任务")
def create_task(body: TaskCreateRequest, request: Request, db: Session = Depends(get_db)):
    """
    将重度计算（如批量生成、爬虫抓取）丢入 Celery 消息队列后台执行。

    输入参数:
    - project_id (可选): 项目ID，关联任务到特定项目，默认从1开始
    - task_type (必填): 任务类型，长度限制1-64字符
    - input_payload (可选): 任务输入参数，JSON格式
    
    输出参数:
    - task_id: 任务ID
    - project_id: 项目ID
    - task_type: 任务类型
    - status: 任务状态，初始为"queued"
    """
    task = TaskService.create_task(
        db=db,
        task_type=body.task_type,
        input_payload=body.input_payload,
        project_id=body.project_id,
    )
    run_task_job.delay(task.id)
    return success_response(
        data={
            "task_id": task.id,
            "project_id": task.project_id,
            "task_type": task.task_type,
            "status": task.status,
        },
        trace_id=request.state.trace_id,
    )


@router.get("", summary="获取（异步）任务列表")
def list_tasks(
    request: Request,
    project_id: int | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
):
    """
    查询所有异步任务或根据项目ID和状态筛选。

    输入参数:
    - project_id (可选): 项目ID，筛选出关联到该项目的任务，默认从1开始
    - status (可选): 任务状态，筛选出该状态的任务
    - page (可选): 页码，默认1
    - page_size (可选): 每页数量，默认10
    
    输出参数:
    - total: 总任务数
    - page: 当前页码
    - page_size: 每页数量
    - tasks: 任务列表，每个任务包含：
      - task_id: 任务ID
      - project_id: 项目ID
      - task_type: 任务类型
      - status: 任务状态
      - created_at: 创建时间
    """
    result = TaskService.list_tasks(db, project_id, status, page, page_size)
    return success_response(
        data={
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "tasks": [
                {
                    "task_id": item.id,
                    "project_id": item.project_id,
                    "task_type": item.task_type,
                    "status": item.status,
                    "created_at": item.created_at.isoformat() if item.created_at else None,
                }
                for item in result["items"]
            ],
        },
        trace_id=request.state.trace_id,
    )


@router.get("/{task_id}", summary="查询任务执行状态与产物")
def get_task(task_id: int, request: Request, db: Session = Depends(get_db)):
    """
    轮询或查询特定后台任务的进度与产出物。
    
    输入参数:
    - task_id (必填): 任务ID
    
    输出参数:
    - task_id: 任务ID
    - project_id: 项目ID
    - task_type: 任务类型
    - status: 任务状态
    - input_payload: 输入参数
    - output_payload: 输出结果
    - error_message: 错误信息
    - started_at: 开始时间
    - finished_at: 结束时间
    - created_at: 创建时间
    - artifacts: 任务产物列表，每个产物包含：
      - artifact_id: 产物ID
      - category: 产物类别
      - file_name: 文件名
      - storage_path: 存储路径
    """
    task = TaskService.get_task_by_id(db=db, task_id=task_id)
    artifacts = ArtifactService.list_by_task(db, task_id)
    return success_response(
        data={
            "task_id": task.id,
            "project_id": task.project_id,
            "task_type": task.task_type,
            "status": task.status,
            "input_payload": task.input_payload,
            "output_payload": task.output_payload,
            "error_message": task.error_message,
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "finished_at": task.finished_at.isoformat() if task.finished_at else None,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "artifacts": [
                {
                    "artifact_id": a.id,
                    "category": a.category,
                    "file_name": a.file_name,
                    "storage_path": a.storage_path,
                }
                for a in artifacts
            ],
        },
        trace_id=request.state.trace_id,
    )