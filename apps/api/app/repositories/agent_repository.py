from sqlalchemy.orm import Session
from app.domain.models.agent_session import AgentSession
from app.domain.models.skill_call import SkillCall


class AgentRepository:
    @staticmethod
    def create_session(db: Session, session_name: str | None, user_input: str, project_id: int | None = None) -> AgentSession:
        session = AgentSession(
            session_name=session_name,
            status="running",
            user_input=user_input,
            context_snapshot={},
            project_id=project_id,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_session(db: Session, session_id: int):
        return db.query(AgentSession).filter(AgentSession.id == session_id).first()

    @staticmethod
    def update_session(db: Session, session: AgentSession, **kwargs):
        for key, value in kwargs.items():
            setattr(session, key, value)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def create_skill_call(
        db: Session,
        session_id: int,
        skill_id: int,
        call_order: int,
        status: str,
        input_payload: dict | None,
        output_payload: dict | None,
        error_message: str | None = None,
    ) -> SkillCall:
        call = SkillCall(
            session_id=session_id,
            skill_id=skill_id,
            call_order=call_order,
            status=status,
            input_payload=input_payload,
            output_payload=output_payload,
            error_message=error_message,
        )
        db.add(call)
        db.commit()
        db.refresh(call)
        return call

    @staticmethod
    def list_calls(db: Session, session_id: int):
        return (
            db.query(SkillCall)
            .filter(SkillCall.session_id == session_id)
            .order_by(SkillCall.call_order.asc())
            .all()
        )

    @staticmethod
    def list_sessions(db: Session, project_id: int, limit: int = 20, offset: int = 0):
        # 按照创建时间倒序拉取历史记录
        return (
            db.query(AgentSession)
            .filter(AgentSession.project_id == project_id) # 必须先 filter
            .order_by(AgentSession.id.desc())              # 建议加上按最新时间排序
            .offset(offset)                                # 最后再分页
            .limit(limit)
            .all()
        )
    