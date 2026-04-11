import json
import os
import shlex
import subprocess

from app.config import settings


class MinerUParser:
    @staticmethod
    def _build_command(pdf_path: str, output_dir: str) -> list[str]:
        command_template = settings.MINERU_COMMAND.strip()
        cmd = [settings.MINERU_EXECUTABLE, "-m", "mineru.cli.client"]
        if "{pdf_path}" in command_template or "{output_dir}" in command_template:
            rendered = command_template.format(pdf_path=pdf_path, output_dir=output_dir)
            cmd.extend(shlex.split(rendered, posix=False))
            return cmd
        if command_template:
            cmd.extend(shlex.split(command_template, posix=False))
        cmd.extend(["-p", pdf_path, "-o", output_dir])
        return cmd

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
    def parse(pdf_path: str, output_dir: str | None = None) -> dict:
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF文件不存在: {pdf_path}")

        if output_dir is None:
            output_dir = os.path.join(settings.STORAGE_BASE, "pdf_parse_outputs")
        os.makedirs(output_dir, exist_ok=True)

        if not os.path.isdir(settings.MINERU_PROJECT_DIR):
            raise FileNotFoundError(f"MinerU目录不存在: {settings.MINERU_PROJECT_DIR}")
        if not os.path.exists(settings.MINERU_EXECUTABLE):
            raise FileNotFoundError("找不到 MinerU 执行文件，请检查配置")

        cmd = MinerUParser._build_command(pdf_path=pdf_path, output_dir=output_dir)

        try:
            process = subprocess.Popen(
                cmd,
                cwd=settings.MINERU_PROJECT_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace",
            )
            output_lines = []
            for line in process.stdout:
                print(line, end="", flush=True)
                output_lines.append(line)
            process.wait(timeout=settings.MINERU_TIMEOUT)

            returncode = process.returncode
            stdout = "".join(output_lines)
            stderr = ""
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            raise TimeoutError(f"MinerU解析超时({settings.MINERU_TIMEOUT}s)")
        except FileNotFoundError as e:
            raise FileNotFoundError(f"MinerU命令不可用: {cmd[0]}") from e

        if returncode != 0:
            raise RuntimeError(
                f"MinerU解析失败, returncode={returncode}, "
                f"stderr={stderr.strip()}, stdout={stdout.strip()}"
            )

        result_file = MinerUParser._find_first_result_file(output_dir)
        parsed_type = None
        parsed_content = None
        if result_file:
            parsed_type, parsed_content = MinerUParser._read_result(result_file)

        return {
            "pdf_path": pdf_path,
            "output_dir": output_dir,
            "result_file": result_file,
            "result_type": parsed_type,
            "result_content": parsed_content,
            "stdout": stdout,
            "stderr": stderr,
        }
