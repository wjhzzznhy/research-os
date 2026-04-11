from pydantic import BaseModel, Field, ConfigDict

class MemoryCreateRequest(BaseModel):
    scope: str = Field(..., min_length=1, max_length=32)
    session_id: int | None = None
    memory_key: str | None = Field(default=None, max_length=128)
    content: str = Field(..., min_length=1)
    source: str | None = Field(default=None, max_length=64)
    importance_score: float = 0.5

class MemoryQueryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    memory_id: int
    scope: str
    session_id: int | None = None
    memory_key: str | None = None
    content: str
    source: str | None = None
    importance_score: float
