# app/domain/schemas/skill.py
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field

class SkillBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    skill_type: str = Field(default="local", description="local 或 http")
    api_url: Optional[str] = None
    api_method: Optional[str] = "POST"
    input_schema: Optional[dict[str, Any]] = None
    output_schema: Optional[dict[str, Any]] = None
    is_enabled: bool = True

class SkillCreate(SkillBase):
    pass

class SkillUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    skill_type: Optional[str] = None
    api_url: Optional[str] = None
    api_method: Optional[str] = None
    input_schema: Optional[dict[str, Any]] = None
    is_enabled: Optional[bool] = None

class SkillData(SkillBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SkillInvokeRequest(BaseModel):
    payload: dict[str, Any] | None = None
