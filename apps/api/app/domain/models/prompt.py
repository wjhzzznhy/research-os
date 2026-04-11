# app/domain/models/prompt.py
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from app.domain.models.base import Base

class Prompt(Base):
    __tablename__ = "prompts"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    description = Column(String)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())