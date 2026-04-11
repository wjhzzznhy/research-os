# app/workers/task_jobs.py
from datetime import datetime

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.logger import get_logger
from app.domain.models.task import Task
from app.application.services.algorithm_service import AlgorithmService
from app.application.services.document_ingest_service import DocumentIngestService

logger = get_logger("worker")


@celery_app.task(name="run_task_job")
def run_task_job(task_id: int):
    db = SessionLocal()
    task = None

    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            logger.error(f"task_id={task_id} not found")
            return

        task.status = "running"
        task.started_at = datetime.utcnow()
        task.error_message = None
        db.commit()

        if task.task_type == "pdf_parse":
            artifact_id = task.input_payload.get("artifact_id")
            if not artifact_id:
                raise ValueError("Payload 中缺少 artifact_id，无法关联解析结果！")
            result = DocumentIngestService.ingest_artifact_pdf(db=db, artifact_id=artifact_id)
        else:
            # 其他算法任务依然走老的通道
            result = AlgorithmService.run_task(
                task_type=task.task_type,
                input_payload=task.input_payload,
            )

        task.status = "success"
        task.output_payload = result
        task.finished_at = datetime.utcnow()
        db.commit()

        logger.info(f"✅ task_id={task_id} finished successfully")

    except Exception as e:
        logger.exception(f"❌ task_id={task_id} failed: {e}")

        if task is None:
            task = db.query(Task).filter(Task.id == task_id).first()

        if task:
            task.status = "failed"
            task.error_message = str(e)
            task.finished_at = datetime.utcnow()
            db.commit()

    finally:
        db.close()