# app/application/memory/base_memory.py
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session

class BaseMemory(ABC):
    def __init__(self, db: Session):
        self.db = db
    
    @abstractmethod
    def read(self, query: str = "", **kwargs):
        raise NotImplementedError

    @abstractmethod
    def write(self, data: dict, **kwargs):
        raise NotImplementedError
    
    @abstractmethod
    def update(self, memory_id: int, content: str, **kwargs):
        raise NotImplementedError

    @abstractmethod
    def delete(self, memory_id: int, **kwargs):
        raise NotImplementedError

    @abstractmethod
    def clear(self, **kwargs):
        raise NotImplementedError
