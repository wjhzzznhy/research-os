# app/domain/models/skill.py
from datetime import datetime
from sqlalchemy import BigInteger, String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.domain.models.base import Base

class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    skill_type: Mapped[str] = mapped_column(String(32), default="local", nullable=False) # 区分技能是本地脚本'local'还是HTTP请求'http'
    api_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    api_method: Mapped[str | None] = mapped_column(String(16), nullable=True, default="POST")

    input_schema: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    output_schema: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
