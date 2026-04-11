import os
from langchain_openai import ChatOpenAI
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger("agents_pool")

_llm_cache = {}


def get_llm(model_name: str = "qwen-plus", temperature: float = 0.7, max_tokens: int = 2048):
    if model_name in _llm_cache:
        return _llm_cache[model_name]

    logger.info(f"🚀 正在初始化大模型实例: {model_name}")

    api_key = settings.LLM_API_KEY or settings.OPENAI_API_KEY or os.getenv("LLM_API_KEY", "")
    base_url = settings.LLM_BASE_URL or settings.OPENAI_BASE_URL or os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")

    if not api_key or api_key == "sk-xxxxxxxxx":
        logger.error("🚨 警告：未配置 LLM_API_KEY，模型将无法成功调用！")

    llm = ChatOpenAI(
        model=model_name,
        api_key=api_key,
        base_url=base_url,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    _llm_cache[model_name] = llm
    return llm
