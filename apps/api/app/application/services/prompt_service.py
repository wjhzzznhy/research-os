# app/application/services/prompt_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.domain.models.prompt import Prompt
from app.domain.schemas.prompt import PromptCreate, PromptUpdate
import uuid

class PromptService:
    @staticmethod
    def create(db: Session, prompt_data: PromptCreate) -> Prompt:
        db_prompt = Prompt(
            id=uuid.uuid4().hex,
            name=prompt_data.name,
            content=prompt_data.content,
            description=prompt_data.description,
            category=prompt_data.category
        )
        db.add(db_prompt)
        db.commit()
        db.refresh(db_prompt)
        return db_prompt
    
    @staticmethod
    def get(db: Session, prompt_id: str) -> Prompt:
        prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
        if not prompt:
            raise BizException(40402, f"提示词 {prompt_id} 不存在", 404)
        return prompt
    
    @staticmethod
    def update(db: Session, prompt_id: str, prompt_data: PromptUpdate) -> Prompt:
        db_prompt = PromptService.get(db, prompt_id)
        update_data = prompt_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_prompt, key, value)
            
        db.commit()
        db.refresh(db_prompt)
        return db_prompt
    
    @staticmethod
    def delete(db: Session, prompt_id: str):
        db_prompt = PromptService.get(db, prompt_id)
        db.delete(db_prompt)
        db.commit()
        return True
    
    @staticmethod
    def list(db: Session, category: str | None = None):
        query = db.query(Prompt)
        if category:
            query = query.filter(Prompt.category == category)
        return query.order_by(Prompt.created_at.desc()).all()
