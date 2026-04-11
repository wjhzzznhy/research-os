# app/application/services/memory_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.repositories.memory_repository import MemoryRepository
from app.repositories.agent_repository import AgentRepository
from app.domain.models.memory_item import MemoryItem

class MemoryService:
    @staticmethod
    def create_memory(
        db: Session,
        scope: str,
        content: str,
        session_id: int | None = None,
        memory_key: str | None = None,
        source: str | None = None,
        importance_score: float = 0.5,
    ):
        # Ensure valid scope
        if scope not in {"session", "long_term"}:
            raise BizException(40002, "invalid memory scope", 400)

        # If session scope, verify session exists
        if scope == "session":
            if session_id is None:
                raise BizException(40003, "session memory requires session_id", 400)
            session = AgentRepository.get_session(db, session_id)
            if not session:
                raise BizException(40405, "agent session not found", 404)

        return MemoryRepository.create(
            db=db,
            scope=scope,
            session_id=session_id,
            memory_key=memory_key,
            content=content,
            source=source,
            importance_score=importance_score,
        )

    @staticmethod
    def list_session_memory(db: Session, session_id: int, limit: int = 20):
        return MemoryRepository.list_session_memory(db, session_id, limit)

    @staticmethod
    def list_long_term_memory(db: Session, limit: int = 20):
        return MemoryRepository.list_long_term_memory(db, limit)

    @staticmethod
    def search_long_term_memory(db: Session, keyword: str, limit: int = 20):
        return MemoryRepository.search_long_term_memory(db, keyword, limit)

    @staticmethod
    def get_relevant_memory_bundle(db: Session, session_id: int | None, user_input: str):
        session_items = []
        if session_id is not None:
            session_items = MemoryService.list_session_memory(db, session_id=session_id, limit=10)

        long_term_items = MemoryService.search_long_term_memory(
            db=db,
            keyword=user_input[:50],
            limit=10,
        )

        if not long_term_items:
            long_term_items = MemoryService.list_long_term_memory(db, limit=5)

        return {
            "session_memory": session_items,
            "long_term_memory": long_term_items,
        }

    @staticmethod
    def update_memory(db: Session, memory_id: int, content: str = None, importance_score: float = None):
        memory = db.query(MemoryItem).filter(MemoryItem.id == memory_id).first()
        if not memory:
            raise BizException(40406, "memory not found", 404)
        
        if content is not None:
            memory.content = content
        if importance_score is not None:
            memory.importance_score = importance_score
            
        db.commit()
        db.refresh(memory)
        return memory

    @staticmethod
    def delete_memory(db: Session, memory_id: int):
        memory = db.query(MemoryItem).filter(MemoryItem.id == memory_id).first()
        if not memory:
            raise BizException(40406, "memory not found", 404)
        db.delete(memory)
        db.commit()
        return True

    @staticmethod
    def clear_memory(db: Session, scope: str, session_id: int | None = None, memory_key_prefix: str | None = None):
        """批量清理記憶 (支持按會話、按前綴清理)"""
        query = db.query(MemoryItem).filter(MemoryItem.scope == scope)
        if session_id == 0:
            session_id = None
        if session_id:
            query = query.filter(MemoryItem.session_id == session_id)
        if memory_key_prefix:
            query = query.filter(MemoryItem.memory_key.like(f"{memory_key_prefix}%"))
            
        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        return deleted_count
