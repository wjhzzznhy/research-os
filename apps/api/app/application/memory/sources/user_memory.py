# app/application/memory/sources/user_memory.py
from sqlalchemy.orm import Session
from app.application.memory.base_memory import BaseMemory
from app.application.services.memory_service import MemoryService

class UserMemory(BaseMemory):
    def __init__(self, db: Session, user_id: int):
        super().__init__(db)
        self.user_id = user_id
    
    def read(self, query: str = "", limit: int = 10, **kwargs):
        # 限定搜索该用户的长期记忆
        return MemoryService.search_long_term_memory(
            self.db, keyword=query, limit=limit
        ) # 提示: 后面需在 Service 层加上 user_id 过滤
    
    def write(self, data: dict, **kwargs):
        return MemoryService.create_memory(
            db=self.db,
            scope="long_term",
            memory_key=f"user:{self.user_id}:{data.get('memory_key', 'preference')}",
            content=data.get("content", ""),
            importance_score=data.get("importance_score", 0.8)
        )

    def update(self, memory_id: int, content: str, **kwargs):
        return MemoryService.update_memory(self.db, memory_id, content=content)

    def delete(self, memory_id: int, **kwargs):
        return MemoryService.delete_memory(self.db, memory_id)

    def clear(self, **kwargs):
        # 根据前缀，一键清空该用户的所有记忆
        return MemoryService.clear_memory(self.db, scope="long_term", memory_key_prefix=f"user:{self.user_id}:")
