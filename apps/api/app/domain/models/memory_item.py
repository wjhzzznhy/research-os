from datetime import datetime
from sqlalchemy import BigInteger, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base


class MemoryItem(Base):
    __tablename__ = "memory_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(32), nullable=False, default="session")
    session_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("agent_sessions.id"), nullable=True)
    memory_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    importance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)