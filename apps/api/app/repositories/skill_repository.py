# app/repositories/skill_repository.py
from sqlalchemy.orm import Session
from app.domain.models.skill import Skill

class SkillRepository:
    @staticmethod
    def list_all(db: Session):
        return db.query(Skill).order_by(Skill.id.asc()).all()

    @staticmethod
    def get_by_name(db: Session, name: str):
        return db.query(Skill).filter(Skill.name == name).first()

    @staticmethod
    def get_by_id(db: Session, skill_id: int):
        return db.query(Skill).filter(Skill.id == skill_id).first()

    @staticmethod
    def create(db: Session, skill_data: dict):
        skill = Skill(**skill_data)
        db.add(skill)
        db.commit()
        db.refresh(skill)
        return skill

    @staticmethod
    def update(db: Session, skill: Skill, update_data: dict):
        for key, value in update_data.items():
            if hasattr(skill, key) and value is not None:
                setattr(skill, key, value)
        db.commit()
        db.refresh(skill)
        return skill

    @staticmethod
    def delete(db: Session, skill: Skill):
        db.delete(skill)
        db.commit()
        return True
