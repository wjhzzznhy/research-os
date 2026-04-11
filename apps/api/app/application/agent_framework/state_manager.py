# app/application/agent_framework/state_manager.py
import uuid
import re
from typing import List, Optional
from pydantic import BaseModel, Field

class Node(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    parent_id: Optional[str] = Field(default=None)
    iteration: int = Field(default=0)
    draft_content: str = Field(description="当前输出内容")
    score: float = Field(description="得分", default=0.0)

class StateManager:
    def __init__(self):
        self.history: List[Node] = []
        self.current_iteration: int = 0
        self.last_node_id: Optional[str] = None
    
    def extract_score(self, content: str) -> float:
        """从模型文本中正则提取打分"""
        score_match = re.search(r'"score":\s*(\d+(\.\d+)?)', content)
        return float(score_match.group(1)) if score_match else 0.0

    def append_node(self, draft_content: str, score: float):
        """记录一次完整的 Agent 思考节点"""
        self.current_iteration += 1
        node = Node(
            parent_id=self.last_node_id,
            iteration=self.current_iteration,
            draft_content=draft_content,
            score=score
        )
        self.history.append(node)
        self.last_node_id = node.id

    def get_best_node(self) -> Optional[Node]:
        """回溯历史最高分节点（用于最终输出或降级容灾）"""
        if not self.history:
            return None
        best_node = max(self.history, key=lambda x: x.score)
        if best_node.draft_content.strip().startswith('{'):
            best_index = self.history.index(best_node)
            if best_index > 0:
                # 攔截成功！返回打分表的前一個節點（即 Generator 辛辛苦苦寫的草稿）
                # 這樣外面拿到的 best_node.draft_content 就是 Markdown，而 best_node.score 依然可以參考
                return self.history[best_index - 1]
        return best_node

# TODO:未来负责把这些日志存进数据库的 task_log 表里。
