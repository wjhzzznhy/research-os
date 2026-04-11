import json
import os

import httpx

from app.core.config import settings


class PDFParseService:
    _client: httpx.Client | None = None

    @classmethod
    def _get_client(cls) -> httpx.Client:
        if cls._client is None or cls._client.is_closed:
            cls._client = httpx.Client(
                timeout=httpx.Timeout(
                    connect=10.0,
                    read=float(settings.MINERU_TIMEOUT + 30),
                    write=30.0,
                    pool=10.0,
                ),
            )
        return cls._client

    @staticmethod
    def _find_first_result_file(output_dir: str, prefer_text: bool = False) -> str | None:
        json_files: list[str] = []
        text_files: list[str] = []
        for root, _, files in os.walk(output_dir):
            for file_name in files:
                lower_name = file_name.lower()
                full_path = os.path.join(root, file_name)
                if lower_name.endswith(".json"):
                    json_files.append(full_path)
                elif lower_name.endswith(".md") or lower_name.endswith(".txt"):
                    text_files.append(full_path)

        preferred_json = sorted(
            json_files,
            key=lambda item: (0 if os.path.basename(item).lower() == "content_list.json" else 1, item),
        )
        preferred_text = sorted(
            text_files,
            key=lambda item: (0 if item.lower().endswith(".md") else 1, item),
        )
        if prefer_text and preferred_text:
            return preferred_text[0]
        if preferred_json:
            return preferred_json[0]
        if preferred_text:
            return preferred_text[0]
        return None

    @staticmethod
    def _read_result(result_file: str) -> tuple[str, dict | str]:
        if result_file.lower().endswith(".json"):
            with open(result_file, "r", encoding="utf-8") as f:
                return "json", json.load(f)
        with open(result_file, "r", encoding="utf-8", errors="replace") as f:
            return "text", f.read()

    @staticmethod
    def parse_pdf(pdf_path: str, output_dir: str | None = None) -> dict:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF文件不存在: {pdf_path}")

        if not settings.MINERU_SERVICE_URL:
            raise RuntimeError("MINERU_SERVICE_URL未配置，请检查环境变量")

        if output_dir is None:
            output_dir = os.path.join(settings.STORAGE_BASE, "pdf_parse_outputs")
        os.makedirs(output_dir, exist_ok=True)

        payload = {"pdf_path": pdf_path, "output_dir": output_dir}
        client = PDFParseService._get_client()

        try:
            resp = client.post(
                f"{settings.MINERU_SERVICE_URL}/parse",
                json=payload,
            )
            resp.raise_for_status()
        except httpx.ConnectError as e:
            raise RuntimeError("MinerU服务不可用，请检查mineru容器是否运行") from e
        except httpx.TimeoutException as e:
            raise TimeoutError(f"MinerU服务请求超时({settings.MINERU_TIMEOUT}s)") from e
        except httpx.HTTPStatusError as e:
            detail = e.response.text
            status_code = e.response.status_code
            if status_code == 404:
                raise FileNotFoundError(detail) from e
            if status_code == 504:
                raise TimeoutError(detail) from e
            raise RuntimeError(f"MinerU解析失败: {detail}") from e

        return resp.json()

    @staticmethod
    def _convert_result_to_text(result_content: dict | str | None) -> str:
        if result_content is None:
            return ""
        if isinstance(result_content, str):
            return result_content
        return json.dumps(result_content, ensure_ascii=False)

    @staticmethod
    def parse_pdf_markdown(pdf_path: str, output_dir: str | None = None) -> str:
        parse_result = PDFParseService.parse_pdf(pdf_path=pdf_path, output_dir=output_dir)
        if parse_result["result_type"] == "text":
            return PDFParseService._convert_result_to_text(parse_result["result_content"])

        markdown_file = PDFParseService._find_first_result_file(
            parse_result["output_dir"],
            prefer_text=True,
        )
        if markdown_file:
            _, markdown_text = PDFParseService._read_result(markdown_file)
            return PDFParseService._convert_result_to_text(markdown_text)

        return PDFParseService._convert_result_to_text(parse_result["result_content"])

    @staticmethod
    def parse_uploaded_pdf(file_bytes: bytes, original_filename: str) -> dict:
        from app.application.services.storage_service import StorageService

        safe_name = os.path.basename(original_filename or "upload.pdf")
        upload_dir = StorageService.build_output_dir(prefix="pdf_upload")
        pdf_path = os.path.join(upload_dir, safe_name)
        output_dir = os.path.join(upload_dir, "output")

        try:
            with open(pdf_path, "wb") as f:
                f.write(file_bytes)

            parse_result = PDFParseService.parse_pdf(pdf_path=pdf_path, output_dir=output_dir)
            return {
                "file_name": safe_name,
                "result_type": parse_result["result_type"],
                "result_content": parse_result["result_content"],
                "stdout": parse_result.get("stdout", ""),
                "stderr": parse_result.get("stderr", ""),
            }
        finally:
            StorageService.delete_dir(upload_dir)
