# scripts/seed_memory.py
import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.core.database import SessionLocal
from app.domain.models.memory_item import MemoryItem
from app.core.logger import get_logger

logger = get_logger("seed_memory")

items = [
    {
        "scope": "long_term",
        "session_id": None,
        "memory_key": "user_preference_1",
        "content": "用户偏好：后端设计优先模块化、结构清晰、便于后续扩展 agent/skill。",
        "source": "seed",
        "importance_score": 0.95,
    },
    {
        "scope": "long_term",
        "session_id": None,
        "memory_key": "project_context_1",
        "content": "当前项目后端已具备 project/task/skill/agent 基础骨架，动态编排引擎已上线。",
        "source": "seed",
        "importance_score": 0.90,
    },
]

def seed():
    db = SessionLocal()
    try:
        for item in items:
            exists = db.query(MemoryItem).filter(MemoryItem.memory_key == item["memory_key"]).first()
            if not exists:
                db.add(MemoryItem(**item))
        db.commit()
        logger.info("✅ 记忆数据 (Memory) 灌注完毕！")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
