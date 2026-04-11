# app/application/memory/operations/management.py
import logging
from app.application.memory.base_memory import BaseMemory

logger = logging.getLogger("memory_management")

class MemoryManagement:
    def __init__(self, memory_instance: BaseMemory):
        self.memory = memory_instance
    
    def clear(self, **kwargs):
        # 批量清理符合条件的记忆
        deleted_count = self.memory.clear(**kwargs)
        logger.info(f"🧹 已清理 {deleted_count} 条记忆数据")
        return deleted_count
    
    def optimize(self, llm_summarize_func=None):
        """
        记忆优化（比如把多个散碎的 session 记忆，总结成一条长期的 user 偏好记忆）
        """
        # 1. 提取最近20条零碎记忆
        recent_memories = self.memory.read(limit=20)
        if not recent_memories or len(recent_memories) < 5:
            return {"status": "skipped", "message": "记忆数量较少，无需优化"}

        logger.info(f"🧠 开始优化 {len(recent_memories)} 条历史记忆...")
        # 2. 拼接所有零散记忆的内容
        combined_text = "\n".join([f"- {m.content}" for m in recent_memories])

        # 3. 压缩逻辑：如果传入了 LLM 的总结函数就用 LLM，否则用简单文本截断
        if llm_summarize_func:
            try:
                summary = llm_summarize_func(combined_text)
            except Exception as e:
                logger.error(f"LLM 记忆总结失败: {e}")
                summary = combined_text[:500] + "...(压缩失败，已截断)"
        else:
            summary = "【自动提炼摘要】\n" + combined_text[:500] + "..."

        # 4. 写入「高价值」记忆
        optimized_memory = self.memory.write({
            "memory_key": "optimized_summary",
            "content": summary,
            "importance_score": 0.95, # 提炼后记忆拥有最高权重
            "source": "system_optimizer"
        })

        # 5. 选择性刪除记忆（这里作为演示，我们不清空，但在实际的高并发场景下，会在这里调用 self.clear() 釋放空间）
        # self.clear(memory_key="session_summary")
        return {
            "status": "success", 
            "optimized_count": len(recent_memories),
            "new_memory_id": optimized_memory.id
        }
