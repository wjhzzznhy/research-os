# app/application/workflows/coding_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class CodingWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_coding_001",
            "name": "代码生成与审查",
            "category": "coding",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {"id": "start_node", "type": "start", "name": "需求入口", "config": {}},
                    {
                        "id": "coder_agent",
                        "type": "agent",
                        "name": "高级程序员",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "coding_generator",
                            "lang": "zh",
                            "tools": [],
                            "inputs": {"requirement": "{user_input}"}
                        }
                    },
                    {"id": "end_node", "type": "end", "name": "输出代码", "config": {}}
                ],
                "edges": [
                    {"source": "start_node", "target": "coder_agent"},
                    {"source": "coder_agent", "target": "end_node"}
                ]
            }
        }
