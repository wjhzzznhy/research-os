# scripts/seed_skills.py
import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.core.database import SessionLocal
from app.domain.models.skill import Skill
from app.core.logger import get_logger

logger = get_logger("seed_skills")

skills = [
    {
        "name": "echo_text",
        "display_name": "文本复读机 (测试)",
        "description": "原样返回输入的文本，用于测试基础链路。",
        "skill_type": "local",
        "input_schema": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]},
        "output_schema": {"type": "object"},
    },
    {
        "name": "health_check",
        "display_name": "系统健康检查 (测试)",
        "description": "返回当前后端服务的存活状态。",
        "skill_type": "local",
        "input_schema": {"type": "object"},
        "output_schema": {"type": "object"},
    },
    {
        "name": "query_task",
        "display_name": "异步任务查询 (测试)",
        "description": "用于测试查询某个长时间运行任务的状态。",
        "skill_type": "local",
        "input_schema": {"type": "object", "properties": {"task_id": {"type": "integer"}}, "required": ["task_id"]},
        "output_schema": {"type": "object"},
    },
    {
        "name": "academic_search",
        "display_name": "学术论文检索",
        "description": "当需要搜索外部真实学术论文、前沿研究时，必须调用此工具。传入搜索关键词。",
        "skill_type": "local",
        "input_schema": {"type": "object", "properties": {"keyword": {"type": "string", "description": "要检索的学术关键词"}}, "required": ["keyword"]},
        "output_schema": {"type": "object", "properties": {"results": {"type": "array"}}},
    },
    {
        "name": "local_knowledge",
        "display_name": "本地知识库检索",
        "description": "当需要从内部结构化文件或项目上下文中检索信息时，调用此工具。",
        "skill_type": "local",
        "input_schema": {"type": "object", "properties": {"query": {"type": "string", "description": "查询问题或关键词"}}, "required": ["query"]},
        "output_schema": {"type": "object", "properties": {"results": {"type": "array"}}},
    },
]

def seed():
    db = SessionLocal()
    try:
        for item in skills:
            exists = db.query(Skill).filter(Skill.name == item["name"]).first()
            if not exists:
                db.add(Skill(**item, is_enabled=True))
            else:
                # 动态更新旧技能的描述等字段
                for k, v in item.items():
                    setattr(exists, k, v)
        db.commit()
        logger.info("✅ 技能数据 (Skills) 灌注完毕！")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
