from typing import Any
from pydantic import BaseModel, Field, ConfigDict


class TaskCreateRequest(BaseModel):
    project_id: int | None = None
    task_type: str = Field(..., min_length=1, max_length=64)
    input_payload: dict[str, Any] | None = None


class TaskData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int | None = None
    task_type: str
    status: str
    input_payload: dict[str, Any] | None = None
    output_payload: dict[str, Any] | None = None
    error_message: str | None = None