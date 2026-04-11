# app/domain/schemas/agent.py
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class AgentRunRequest(BaseModel):
    project_id: int = Field(..., description="所属项目ID，用于数据隔离")
    workflow_id: str = Field(..., description="要执行的动态工作流图纸 ID (如 sys_innovation_001)")
    session_name: Optional[str] = Field(default="动态引擎会话", description="本次会话的名称")
    user_input: str = Field(..., min_length=1, description="用户的输入文字")
    payload: Optional[Dict[str, Any]] = Field(default_factory=dict, description="额外上下文参数")

class AgentSessionData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_name: str | None = None
    status: str
    user_input: str
    final_output: str | None = None
    context_snapshot: dict | None = None