# app/domain/models/artifact.py
from datetime import datetime
from sqlalchemy import BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.domain.models.base import Base


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    project_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    task_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("tasks.id"), nullable=True)
    document_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    category: Mapped[str] = mapped_column(String(32), nullable=False, default="input")
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)