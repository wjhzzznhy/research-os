# app/domain/schemas/workflow.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    graph_config: Dict[str, Any] = Field(..., description="LangGraph 工作流模板JSON配置")
    is_system: bool = False

class WorkflowCreate(WorkflowBase):
    id: str = Field(..., description="前端可自定义ID，或后端生成")

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    graph_config: Optional[Dict[str, Any]] = None
    is_system: Optional[bool] = None

class Workflow(WorkflowBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)