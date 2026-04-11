from datetime import datetime

from sqlalchemy import BigInteger, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.domain.models.base import Base


class TaskLog(Base):
    __tablename__ = "task_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    level: Mapped[str] = mapped_column(String(16), nullable=False, default="INFO")
    stage: Mapped[str] = mapped_column(String(32), nullable=False, default="execute")
    message: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)