# app/application/memory/sources/session_memory.py
from sqlalchemy.orm import Session
from app.application.memory.base_memory import BaseMemory
from app.application.services.memory_service import MemoryService

class SessionMemory(BaseMemory):
    def __init__(self, db: Session, session_id: int):
        super().__init__(db)
        self.session_id = session_id
    
    def read(self, query: str = "", limit: int = 20, **kwargs):
        # 会话记忆通常不需要搜索，直接按时间倒序拉取最近的
        return MemoryService.list_session_memory(self.db, self.session_id, limit)
    
    def write(self, data: dict, **kwargs):
        return MemoryService.create_memory(
            db=self.db,
            scope="session",
            session_id=self.session_id,
            memory_key=data.get("memory_key", "session_context"),
            content=data.get("content", ""),
            source=data.get("source", "agent")
        )

    def update(self, memory_id: int, content: str, **kwargs):
        return MemoryService.update_memory(self.db, memory_id, content=content)

    def delete(self, memory_id: int, **kwargs):
        return MemoryService.delete_memory(self.db, memory_id)

    def clear(self, **kwargs):
        # 一键清空当前会话记忆的所有短期记忆
        return MemoryService.clear_memory(self.db, scope="session", session_id=self.session_id)
