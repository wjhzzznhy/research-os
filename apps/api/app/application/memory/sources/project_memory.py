# app/application/memory/sources/project_memory.py
from sqlalchemy.orm import Session
from app.application.memory.base_memory import BaseMemory
from app.application.services.memory_service import MemoryService

class ProjectMemory(BaseMemory):
    def __init__(self, db: Session, project_id: int):
        super().__init__(db)
        self.project_id = project_id
    
    def read(self, query: str = "", limit: int = 10, **kwargs):
        return MemoryService.search_long_term_memory(self.db, keyword=query, limit=limit)
    
    def write(self, data: dict, **kwargs):
        return MemoryService.create_memory(
            db=self.db,
            scope="long_term",
            memory_key=f"project:{self.project_id}:{data.get('memory_key', 'context')}",
            content=data.get("content", ""),
            importance_score=data.get("importance_score", 0.9)
        )

    def delete(self, memory_id: int, **kwargs):
        pass
