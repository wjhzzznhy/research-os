import os
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.common.response import success_response
from app.common.exceptions import BizException
from app.core.config import settings
from app.core.agents import clear_llm_cache
from app.core.logger import get_logger

logger = get_logger("system_api")
router = APIRouter()


class SystemConfigUpdate(BaseModel):
    llm_api_key: str | None = Field(None, description="大模型 API Key")
    llm_base_url: str | None = Field(None, description="大模型 API Base URL")
    llm_model_default: str | None = Field(None, description="默认模型名称")


@router.get("/health", summary="系统健康/存活性检查")
def health_check(request: Request):
    return success_response(
        data={
            "app_name": settings.PROJECT_NAME,
            "env": settings.APP_ENV,
            "status": "ok",
            "algorithm_mode": settings.ALGORITHM_MODE,
        },
        trace_id=request.state.trace_id,
    )


@router.get("/config", summary="获取系统 LLM 配置")
def get_system_config(request: Request):
    raw_api_key = settings.LLM_API_KEY or os.getenv("LLM_API_KEY", "")
    masked_key = f"{raw_api_key[:3]}***{raw_api_key[-4:]}" if len(raw_api_key) > 8 else "***"

    return success_response(
        data={
            "llm_api_key_masked": masked_key,
            "llm_base_url": settings.LLM_BASE_URL or os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
            "llm_model_default": settings.LLM_MODEL_DEFAULT or os.getenv("LLM_MODEL_DEFAULT", "qwen-plus"),
        },
        trace_id=request.state.trace_id,
    )


@router.put("/config", summary="热更新系统 LLM 配置")
def update_system_config(body: SystemConfigUpdate, request: Request):
    env_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
        ".env",
    )

    if body.llm_api_key:
        os.environ["LLM_API_KEY"] = body.llm_api_key
        settings.LLM_API_KEY = body.llm_api_key

    if body.llm_base_url:
        os.environ["LLM_BASE_URL"] = body.llm_base_url
        settings.LLM_BASE_URL = body.llm_base_url

    if body.llm_model_default:
        os.environ["LLM_MODEL_DEFAULT"] = body.llm_model_default
        settings.LLM_MODEL_DEFAULT = body.llm_model_default

    clear_llm_cache()

    try:
        if os.path.exists(env_file_path):
            with open(env_file_path, "r") as f:
                lines = f.readlines()

            with open(env_file_path, "w") as f:
                seen_keys = set()
                for line in lines:
                    if line.startswith("LLM_API_KEY=") and body.llm_api_key:
                        f.write(f"LLM_API_KEY={body.llm_api_key}\n")
                        seen_keys.add("LLM_API_KEY")
                    elif line.startswith("LLM_BASE_URL=") and body.llm_base_url:
                        f.write(f"LLM_BASE_URL={body.llm_base_url}\n")
                        seen_keys.add("LLM_BASE_URL")
                    elif line.startswith("LLM_MODEL_DEFAULT=") and body.llm_model_default:
                        f.write(f"LLM_MODEL_DEFAULT={body.llm_model_default}\n")
                        seen_keys.add("LLM_MODEL_DEFAULT")
                    else:
                        f.write(line)
                if body.llm_api_key and "LLM_API_KEY" not in seen_keys:
                    f.write(f"LLM_API_KEY={body.llm_api_key}\n")
                if body.llm_base_url and "LLM_BASE_URL" not in seen_keys:
                    f.write(f"LLM_BASE_URL={body.llm_base_url}\n")
                if body.llm_model_default and "LLM_MODEL_DEFAULT" not in seen_keys:
                    f.write(f"LLM_MODEL_DEFAULT={body.llm_model_default}\n")

            logger.info("✅ 系统 LLM 配置已成功更新并持久化至 .env 文件")
        else:
            logger.warning(f"⚠️ 未找到 {env_file_path} 文件，仅在当前进程内存中生效。")

    except Exception as e:
        logger.error(f"❌ 写入 .env 文件失败: {str(e)}")
        raise BizException(50000, "更新配置文件失败", 500)

    return success_response(data={"message": "System config updated successfully"}, trace_id=request.state.trace_id)
