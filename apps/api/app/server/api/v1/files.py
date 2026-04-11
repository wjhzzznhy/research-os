# app/server/api/v1/files.py
from fastapi import APIRouter, Depends, File, UploadFile, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.server.deps import get_db
from app.common.response import success_response
from app.application.services.storage_service import StorageService
from app.application.services.artifact_service import ArtifactService

router = APIRouter()


@router.post("/upload", summary="上传文件")
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    project_id: int | None = None,
    task_id: int | None = None,
    category: str = "input",
    db: Session = Depends(get_db),
):
    """
    接收用户上传的文件，存入本地存储或 OSS，并生成 Artifact 记录。

    输入参数:
    - file: 上传的文件
    - project_id (可选): 项目ID，关联文件到特定项目
    - task_id (可选): 任务ID，关联文件到特定任务
    - category (可选): 文件类别，默认为"input"
    
    输出参数:
    - artifact_id: 文件记录ID
    - project_id: 项目ID
    - task_id: 任务ID
    - file_name: 文件名
    - storage_path: 存储路径
    - file_size: 文件大小
    """
    saved = StorageService.save_upload(file)
    artifact = ArtifactService.create_artifact(
        db=db,
        file_name=saved["file_name"],
        storage_path=saved["storage_path"],
        content_type=saved["content_type"],
        file_size=saved["file_size"],
        category=category,
        task_id=task_id,
        project_id=project_id,
    )
    return success_response(
        data={
            "artifact_id": artifact.id,
            "project_id": artifact.project_id,
            "task_id": artifact.task_id,
            "file_name": artifact.file_name,
            "storage_path": artifact.storage_path,
            "file_size": artifact.file_size,
        },
        trace_id=request.state.trace_id,
    )


@router.get("/{artifact_id}/download", summary="下载文件")
def download_file(artifact_id: int, db: Session = Depends(get_db)):
    """  
    输入参数:
    - artifact_id: 文件记录ID
    
    输出参数:
    - 文件流: 二进制文件数据
    """
    artifact = ArtifactService.get_artifact(db, artifact_id)
    full_path = StorageService.resolve_path(artifact.storage_path)
    return FileResponse(
        path=full_path,
        filename=artifact.file_name,
        media_type=artifact.content_type or "application/octet-stream",
    )
    