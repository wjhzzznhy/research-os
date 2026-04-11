# app/domain/schemas/prompt.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class PromptBase(BaseModel):
    name: str
    content: str
    description: Optional[str] = None
    category: Optional[str] = None

class PromptCreate(PromptBase):
    pass

class PromptUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None

class Prompt(PromptBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)