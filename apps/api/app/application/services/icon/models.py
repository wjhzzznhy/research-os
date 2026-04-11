from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid


class EmbeddingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class IconStatus(str, Enum):
    ACTIVE = "active"
    DELETED = "deleted"


@dataclass
class Icon:
    id: str
    name: str
    render_file_path: str
    style: Optional[str] = None
    source_file_path: Optional[str] = None
    tags_manual: List[str] = field(default_factory=list)
    embedding: Optional[List[float]] = None
    embedding_model: str = "qwen3-vl-embedding-2b"
    embedding_at: Optional[datetime] = None
    embedding_status: EmbeddingStatus = EmbeddingStatus.PENDING
    embedding_error: Optional[str] = None
    retry_count: int = 0
    status: IconStatus = IconStatus.ACTIVE
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def from_db_row(cls, row: Dict[str, Any]) -> "Icon":
        return cls(
            id=str(row.get("id", "")),
            name=row.get("name", ""),
            render_file_path=row.get("render_file_path", ""),
            style=row.get("style"),
            source_file_path=row.get("source_file_path"),
            tags_manual=list(row.get("tags_manual") or []),
            embedding=list(row["embedding"]) if row.get("embedding") else None,
            embedding_model=row.get("embedding_model", "qwen3-vl-embedding-2b"),
            embedding_at=row.get("embedding_at"),
            embedding_status=EmbeddingStatus(row.get("embedding_status", "pending")),
            embedding_error=row.get("embedding_error"),
            retry_count=row.get("retry_count", 0),
            status=IconStatus(row.get("status", "active")),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "render_file_path": self.render_file_path,
            "style": self.style,
            "source_file_path": self.source_file_path,
            "tags_manual": self.tags_manual,
            "embedding_status": self.embedding_status.value,
            "retry_count": self.retry_count,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


@dataclass
class IconSearchResult:
    icon: Icon
    similarity: float

    def to_dict(self) -> Dict[str, Any]:
        result = self.icon.to_dict()
        result["similarity"] = self.similarity
        return result


@dataclass
class IconUploadRequest:
    name: str
    file_bytes: bytes
    content_type: str
    style: Optional[str] = None
    tags: Optional[List[str]] = None
    source_file_path: Optional[str] = None
