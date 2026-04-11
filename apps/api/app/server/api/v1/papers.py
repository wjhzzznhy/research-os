# app/server/api/v1/papers.py
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from sqlalchemy.orm import Session
from typing import Optional

from app.application.services.artifact_service import ArtifactService
from app.application.services.document_ingest_service import DocumentIngestService
from app.application.services.storage_service import StorageService
from app.application.services.task_service import TaskService
from app.common.exceptions import BizException
from app.common.response import success_response
from app.domain.models.artifact import Artifact
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.server.deps import get_db
from app.workers.task_jobs import run_task_job


router = APIRouter()


@router.post("/pdf/upload-and-parse-result", summary="上传并解析PDF文件（同步）")
def upload_and_parse_pdf_result(
    request: Request,
    file: UploadFile = File(...),
    project_id: int | None = None,
    db: Session = Depends(get_db),
):
    """
    输入参数:
    - file: 要上传的PDF文件
    - project_id (可选): 项目ID
    
    输出参数:
    - artifact_id: 工件ID
    - project_id: 项目ID
    - 其他解析结果字段
    """
    # 1. 统一由 Storage + Artifact 处理上传（和 files.py 逻辑一致）
    saved = StorageService.save_upload(file)
    artifact = ArtifactService.create_artifact(
        db=db,
        file_name=saved["file_name"],
        storage_path=saved["storage_path"],
        content_type=saved["content_type"],
        file_size=saved["file_size"],
        category="input",
        project_id=project_id,
    )
    # 2. 传入 artifact.id 进行解析
    try:
        result = DocumentIngestService.ingest_artifact_pdf(db=db, artifact_id=artifact.id)
        result["artifact_id"] = artifact.id
        result["project_id"] = project_id
    except TimeoutError as e:
        raise BizException(50010, str(e), 500) from e
    except (RuntimeError, FileNotFoundError, ValueError) as e:
        raise BizException(50011, str(e), 500) from e

    return success_response(data=result, trace_id=request.state.trace_id)


@router.post("/pdf/upload-and-parse", summary="上传并解析PDF文件（异步）")
def upload_and_parse_pdf(
    request: Request,
    file: UploadFile = File(...),
    project_id: int | None = None,
    db: Session = Depends(get_db),
):
    """
    输入参数:
    - file: 要上传的PDF文件
    - project_id (可选): 项目ID
    
    输出参数:
    - task_id: 任务ID
    - artifact_id: 工件ID
    - project_id: 项目ID
    - file_name: 文件名
    - status: 任务状态
    """
    saved = StorageService.save_upload(file)

    artifact = ArtifactService.create_artifact(
        db=db,
        file_name=saved["file_name"],
        storage_path=saved["storage_path"],
        content_type=saved["content_type"],
        file_size=saved["file_size"],
        category="input",
        project_id=project_id,
    )

    task = TaskService.create_task(
        db=db,
        task_type="pdf_parse",
        input_payload={"pdf_path": saved["storage_path"], "artifact_id": artifact.id},
        project_id=project_id,
    )

    run_task_job.delay(task.id)

    return success_response(
        data={
            "task_id": task.id,
            "artifact_id": artifact.id,
            "project_id": project_id,
            "file_name": artifact.file_name,
            "status": task.status,
        },
        trace_id=request.state.trace_id,
    )


@router.get("/documents/{document_id}/chunks", summary="获取文档分块列表")
def list_document_chunks(
    document_id: UUID,
    request: Request,
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    输入参数:
    - document_id: 文档ID
    - limit (可选): 返回数量限制，默认200，范围1-500
    - offset (可选): 偏移量，默认0
    
    输出参数:
    - total: 分块总数
    - chunks: 分块列表
      - chunk_id: 分块ID
      - chunk_index: 分块索引
      - chapter: 章节
      - title: 标题
      - content: 内容
    """
    chunks = DocumentChunkRepository.list_by_document_id(
        db=db,
        document_id=document_id,
        limit=limit,
        offset=offset,
    )
    return success_response(
        data={
            "total": len(chunks),
            "chunks": [
                {
                    "chunk_id": str(chunk.id),
                    "chunk_index": chunk.chunk_index,
                    "chapter": chunk.chapter,
                    "title": chunk.title,
                    "content": chunk.content,
                }
                for chunk in chunks
            ],
        },
        trace_id=request.state.trace_id,
    )

@router.get("/artifacts/{artifact_id}/chunks", summary="通过artifact_id获取文档分块列表")
def list_chunks_by_artifact(
    artifact_id: int,
    request: Request,
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """
    输入参数:
    - artifact_id: 工件ID
    - limit (可选): 返回数量限制，默认200，范围1-500
    - offset (可选): 偏移量，默认0
    
    输出参数:
    - document_id: 文档ID
    - artifact_id: 工件ID
    - project_id: 项目ID
    - total: 分块总数
    - chunks: 分块列表
      - chunk_id: 分块ID
      - chunk_index: 分块索引
      - chapter: 章节
      - title: 标题
      - content: 内容
    """
    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise BizException(404, "文件不存在", 404)

    if not artifact.document_id:
        raise BizException(404, "该文件尚未被解析完成或解析失败", 404)
    
    chunks = DocumentChunkRepository.list_by_document_id(
        db=db,
        document_id=artifact.document_id,
        limit=limit,
        offset=offset,
    )
    
    # 3. 返回跟原接口一模一样的结构
    return success_response(
        data={
            "document_id": str(artifact.document_id),
            "artifact_id": artifact.id,
            "project_id": artifact.project_id,
            "total": len(chunks),
            "chunks": [
                {
                    "chunk_id": str(chunk.id),
                    "chunk_index": chunk.chunk_index,
                    "chapter": chunk.chapter,
                    "title": chunk.title,
                    "content": chunk.content,
                }
                for chunk in chunks
            ],
        },
        trace_id=request.state.trace_id,
    )
