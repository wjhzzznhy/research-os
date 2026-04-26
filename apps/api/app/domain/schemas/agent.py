# app/domain/schemas/agent.py
from datetime import datetime
from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class AgentSkillTemplate(BaseModel):
    id: str
    name: str
    description: str | None = None
    type: Literal["tool", "api", "knowledge", "code"] = "tool"
    enabled: bool = True


class StudioWorkflowNode(BaseModel):
    id: str
    type: Literal["start", "llm", "tool", "condition", "reply", "knowledge"]
    label: str
    x: float = 0
    y: float = 0
    config: Dict[str, Any] | None = None


class StudioWorkflowEdge(BaseModel):
    from_: str = Field(alias="from")
    to: str
    label: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class StudioWorkflow(BaseModel):
    nodes: list[StudioWorkflowNode] = Field(default_factory=list)
    edges: list[StudioWorkflowEdge] = Field(default_factory=list)


class AgentTemplateBase(BaseModel):
    name: str
    description: str | None = None
    icon: str | None = "🤖"
    color: str | None = "#1a5c3a"
    role: str | None = None
    system_prompt: str | None = Field(default=None, alias="systemPrompt")
    model: str = "qwen-plus"
    temperature: float = 0.7
    max_tokens: int = Field(default=2048, alias="maxTokens")
    status: Literal["active", "draft", "disabled"] = "draft"
    skills: list[AgentSkillTemplate] = Field(default_factory=list)
    workflow: StudioWorkflow = Field(default_factory=StudioWorkflow)
    calls: int = 0

    model_config = ConfigDict(populate_by_name=True)


class AgentTemplateCreate(AgentTemplateBase):
    id: str | None = None


class AgentTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    role: str | None = None
    system_prompt: str | None = Field(default=None, alias="systemPrompt")
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = Field(default=None, alias="maxTokens")
    status: Literal["active", "draft", "disabled"] | None = None
    skills: list[AgentSkillTemplate] | None = None
    workflow: StudioWorkflow | None = None
    calls: int | None = None

    model_config = ConfigDict(populate_by_name=True)


class AgentTemplateData(AgentTemplateBase):
    id: str
    workflow_id: str = Field(alias="workflowId")
    last_modified: str = Field(alias="lastModified")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

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
