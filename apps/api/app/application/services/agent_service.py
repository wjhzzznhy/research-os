# app/application/services/agent_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.repositories.agent_repository import AgentRepository

class AgentService:
    @staticmethod
    def get_session(db: Session, session_id: int):
        session = AgentRepository.get_session(db, session_id)
        if not session:
            raise BizException(40405, "agent session not found", 404)
        return session

    @staticmethod
    def list_calls(db: Session, session_id: int):
        return AgentRepository.list_calls(db, session_id)

    @staticmethod
    def list_sessions(db: Session, project_id: int, limit: int = 20, offset: int = 0):
        return AgentRepository.list_sessions(db, project_id, limit, offset)

    @staticmethod
    def create_session(db: Session, session_name: str | None, user_input: str, project_id: int):
        return AgentRepository.create_session(db, session_name, user_input, project_id)

    @staticmethod
    def update_session(db: Session, session_id: int, **kwargs):
        session = AgentRepository.get_session(db, session_id)
        if not session:
            raise BizException(40405, "agent session not found", 404)
        return AgentRepository.update_session(db, session, **kwargs)
