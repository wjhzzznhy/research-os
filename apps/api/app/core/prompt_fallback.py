# app/core/prompt_fallback.py
import os
from app.core.logger import get_logger

logger = get_logger("prompt_fallback")

# 定位到 backend/app/prompts 目录 (基于当前文件所在位置反推)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PROMPTS_DIR = os.path.join(BASE_DIR, "prompts", "roles")

def get_fallback_prompt(prompt_name: str, lang: str = "zh") -> str:
    """
    负责在数据库查不到时，去获取本地兜底的 Markdown 提示词文件
    :param prompt_name: 文件名（不含 .md 后缀），如 "innovation_generation"
    :param lang: 语言，"zh" 或 "en"
    """
    if not prompt_name:
        return ""
        
    # 拼接路径：如果是英文，进 en/ 目录
    if lang == "en":
        file_path = os.path.join(PROMPTS_DIR, "en", f"{prompt_name}.md")
    else:
        file_path = os.path.join(PROMPTS_DIR, f"{prompt_name}.md")

    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                logger.info(f"✅ 成功加载本地兜底提示词: {prompt_name}.md ({lang})")
                return content
        except Exception as e:
            logger.error(f"❌ 读取本地提示词文件失败 {file_path}: {e}")
    else:
        logger.warning(f"⚠️ 本地兜底提示词文件不存在: {file_path}")

    return ""