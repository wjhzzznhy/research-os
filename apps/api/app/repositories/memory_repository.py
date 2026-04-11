from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.domain.models.memory_item import MemoryItem


class MemoryRepository:
    @staticmethod
    def create(
        db: Session,
        scope: str,
        content: str,
        session_id: int | None = None,
        memory_key: str | None = None,
        source: str | None = None,
        importance_score: float = 0.5,
    ) -> MemoryItem:
        item = MemoryItem(
            scope=scope,
            session_id=session_id,
            memory_key=memory_key,
            content=content,
            source=source,
            importance_score=importance_score,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def list_session_memory(db: Session, session_id: int, limit: int = 20):
        return (
            db.query(MemoryItem)
            .filter(MemoryItem.scope == "session", MemoryItem.session_id == session_id)
            .order_by(desc(MemoryItem.id))
            .limit(limit)
            .all()
        )

    @staticmethod
    def list_long_term_memory(db: Session, limit: int = 20):
        return (
            db.query(MemoryItem)
            .filter(MemoryItem.scope == "long_term")
            .order_by(desc(MemoryItem.importance_score), desc(MemoryItem.id))
            .limit(limit)
            .all()
        )

    @staticmethod
    def search_long_term_memory(db: Session, keyword: str, limit: int = 20):
        return (
            db.query(MemoryItem)
            .filter(MemoryItem.scope == "long_term", MemoryItem.content.ilike(f"%{keyword}%"))
            .order_by(desc(MemoryItem.importance_score), desc(MemoryItem.id))
            .limit(limit)
            .all()
        )
