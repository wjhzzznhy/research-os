# app/application/memory/operations/writing.py
from app.application.memory.base_memory import BaseMemory

class MemoryWriting:
    def __init__(self, memory_instance: BaseMemory):
        self.memory = memory_instance
    
    def add(self, memory_key: str, content: str, **kwargs):
        data = {"memory_key": memory_key, "content": content}
        data.update(kwargs)
        return self.memory.write(data)
    
    def update(self, memory_id: int, content: str):
        # 调用数据库的更新逻辑
        return self.memory.update(memory_id, content)
