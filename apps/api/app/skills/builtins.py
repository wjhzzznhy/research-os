# app/skills/builtins.py
from sqlalchemy.orm import Session
from app.skills.base import BaseSkillExecutor

class EchoTextSkill(BaseSkillExecutor):
    def execute(self, payload: dict, db: Session = None) -> dict:
        return {"echo": payload.get("text", "")}

class HealthCheckSkill(BaseSkillExecutor):
    def execute(self, payload: dict, db: Session = None) -> dict:
        return {"status": "ok", "source": "skill"}

class QueryTaskSkill(BaseSkillExecutor):
    def execute(self, payload: dict, db: Session = None) -> dict:
        return {
            "message": "query_task skill placeholder",
            "task_id": payload.get("task_id"),
        }
