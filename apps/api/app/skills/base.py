# app/skills/base.py
from sqlalchemy.orm import Session

class BaseSkillExecutor:
    def execute(self, payload: dict, db: Session) -> dict:
        raise NotImplementedError