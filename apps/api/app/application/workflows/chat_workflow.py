# app/application/workflows/chat_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class ChatWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_chat_001",
            "name": "日常对话助手",
            "category": "chat",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {"id": "start_node", "type": "start", "name": "对话入口", "config": {}},
                    {
                        "id": "chat_agent",
                        "type": "agent",
                        "name": "聊天助手",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "chat_assistant",
                            "lang": "zh",
                            "tools": [],
                            "inputs": {"goal": "{user_input}"}
                        }
                    },
                    {"id": "end_node", "type": "end", "name": "结束", "config": {}}
                ],
                "edges": [
                    {"source": "start_node", "target": "chat_agent"},
                    {"source": "chat_agent", "target": "end_node"}
                ]
            }
        }
