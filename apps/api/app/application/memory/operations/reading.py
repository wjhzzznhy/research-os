# app/application/memory/operations/reading.py
from app.application.memory.base_memory import BaseMemory

class MemoryReading:
    def __init__(self, memory_instance: BaseMemory):
        self.memory = memory_instance
    
    def get_recent(self, limit: int = 10):
        # 获取最近的记忆 (无条件查询)
        return self.memory.read(query="", limit=limit)
    
    def search(self, query: str, top_k: int = 5):
        # 语义/关键词搜索记忆
        return self.memory.read(query=query, limit=top_k)
