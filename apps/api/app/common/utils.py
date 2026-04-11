# app/common/utils.py
import re
from typing import List, Dict, Any

def parse_llm_config(config: Any, roles: List[str], default_model: str = "qwen-plus") -> Dict[str, str]:
    """通用模型配置解析器：兼容单模、列表、字典、自定义对象"""
    result = {role: default_model for role in roles}
    if not config: 
        return result
        
    if isinstance(config, str):
        result = {role: config for role in roles}
    elif isinstance(config, list) and len(config) > 0:
        for i, role in enumerate(roles):
            result[role] = config[i % len(config)]
    elif isinstance(config, dict):
        fallback = next(iter(config.values())) if config else default_model
        for role in roles:
            result[role] = config.get(role, fallback)
    elif hasattr(config, "model_dump"):
        return parse_llm_config(config.model_dump(), roles, default_model)
    elif hasattr(config, "dict"):
        return parse_llm_config(config.dict(), roles, default_model)
        
    return result

def parse_markdown_sections(markdown_text: str) -> Dict[str, str]:
    """
    通用 Markdown 解析器：自动识别文本中带有 '#' 的标题区块，将其切割成字典。
    例如大模型输出:
      # Background
      ...内容...
      # My Data
      ...内容...
    会自动返回: {"background": "...内容...", "my_data": "...内容..."}
    """
    sections = {}

    # 在文本前面强制加个换行符，方便正则统一匹配所有标题
    text = "\n" + markdown_text

    # 正则解析：找寻 \n# 开始的标题，捕获标题名，再捕获内容，直到下一个 \n# 或文本结尾
    pattern = re.compile(r'\n#+\s*(.*?)\n(.*?)(?=\n#+|$)', re.DOTALL | re.IGNORECASE)
    matches = pattern.findall(text)

    if not matches:
        return {"content": markdown_text.strip()}

    for title, content in matches:
        # 将标题规范化为 Python 字典的 key: "Core Idea" -> "core_idea"
        key = title.strip().lower().replace(" ", "_").replace("-", "_")
        sections[key] = content.strip()
        
    return sections

def format_list(text_block: str) -> list:
    """
    通用列表格式化器：自动识别文本中带有 "-" 或 "*" 的列表项，将其切割成 Python List。
    例如大模型输出:
      - Item 1
      - Item 2
      - Item 3
    会自动返回: ["Item 1", "Item 2", "Item 3"]
    """
    if not text_block: 
        return []
    # 按换行切分，并自动剥离行首的 "-" 或 "*" 和空白字符
    return [line.lstrip('-*').strip() for line in text_block.split('\n') if line.strip()]