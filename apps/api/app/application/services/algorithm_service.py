# app/application/services/algorithm_service.py
import json
import subprocess
import time

from app.core.config import settings
from app.application.services.pdf_parse_service import PDFParseService


class AlgorithmService:
    @staticmethod
    def run_mock_task(task_type: str, input_payload: dict | None = None) -> dict:
        time.sleep(5)
        return {
            "task_type": task_type,
            "received_payload": input_payload or {},
            "message": "mock algorithm finished",
            "result": {
                "score": 0.98,
                "status": "ok",
            },
        }

    @staticmethod
    def run_command_task(task_type: str, input_payload: dict | None = None) -> dict:
        if not settings.ALGORITHM_COMMAND:
            raise RuntimeError("ALGORITHM_COMMAND is empty")

        process = subprocess.run(
            settings.ALGORITHM_COMMAND,
            shell=True,
            capture_output=True,
            text=True,
        )
        if process.returncode != 0:
            raise RuntimeError(process.stderr or "algorithm command failed")

        try:
            parsed = json.loads(process.stdout or "{}")
        except Exception:
            parsed = {
                "stdout": process.stdout,
                "stderr": process.stderr,
            }

        return {
            "task_type": task_type,
            "received_payload": input_payload or {},
            "message": "command algorithm finished",
            "result": parsed,
        }

    @staticmethod
    def run_pdf_parse_task(input_payload: dict | None = None) -> dict:
        if not input_payload:
            raise ValueError("input_payload is required for pdf_parse task")

        pdf_path = input_payload.get("pdf_path")
        if not pdf_path:
            raise ValueError("pdf_path is required in input_payload")

        output_dir = input_payload.get("output_dir")
        result = PDFParseService.parse_pdf(pdf_path, output_dir)

        return {
            "task_type": "pdf_parse",
            "received_payload": input_payload,
            "message": "PDF解析完成",
            "result": result,
        }

    @staticmethod
    def run_task(task_type: str, input_payload: dict | None = None) -> dict:
        if task_type == "pdf_parse":
            return AlgorithmService.run_pdf_parse_task(input_payload)
        if settings.ALGORITHM_MODE == "command":
            return AlgorithmService.run_command_task(task_type, input_payload)
        return AlgorithmService.run_mock_task(task_type, input_payload)
