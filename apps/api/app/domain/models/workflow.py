# app/domain/models/workflow.py
from datetime import datetime
from sqlalchemy import String, DateTime, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.domain.models.base import Base

class Workflow(Base):
    __tablename__ = "workflows"
    
    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    
    graph_config: Mapped[dict] = mapped_column(JSON, nullable=False) # json存工作流模板
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False) # 区分系统内置与用户自定义

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
