from sqlalchemy.orm import Session

from app.domain.models.agent_template import AgentTemplate


class AgentTemplateRepository:
    @staticmethod
    def list(db: Session) -> list[AgentTemplate]:
        return db.query(AgentTemplate).order_by(AgentTemplate.updated_at.desc().nullslast(), AgentTemplate.created_at.desc()).all()

    @staticmethod
    def get(db: Session, template_id: str) -> AgentTemplate | None:
        return db.query(AgentTemplate).filter(AgentTemplate.id == template_id).first()

    @staticmethod
    def create(db: Session, template: AgentTemplate) -> AgentTemplate:
        db.add(template)
        db.commit()
        db.refresh(template)
        return template

    @staticmethod
    def update(db: Session, template: AgentTemplate, values: dict) -> AgentTemplate:
        for key, value in values.items():
            setattr(template, key, value)
        db.commit()
        db.refresh(template)
        return template

    @staticmethod
    def delete(db: Session, template: AgentTemplate) -> None:
        db.delete(template)
        db.commit()
