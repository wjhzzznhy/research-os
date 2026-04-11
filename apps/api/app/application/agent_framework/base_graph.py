# app/application/agent_framework/base_graph.py
from abc import ABC, abstractmethod

class BaseGraph(ABC):
    """
    不包含执行逻辑，只负责约束系统预置的 JSON 图纸模板。
    """
    @classmethod
    @abstractmethod
    def get_default_config(cls) -> dict:
        """
        所有预置的 workflow 子类必须实现此方法，返回标准的 JSON 工作流模板结构。
        系统初始化时，会被 scripts/init_db.py 刷入数据库。
        """
        pass
