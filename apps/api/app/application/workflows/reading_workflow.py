# app/application/workflows/reading_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class ReadingWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_reading_001",
            "name": "文档阅读与摘要",
            "category": "reading",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {"id": "start_node", "type": "start", "name": "文档入口", "config": {}},
                    {
                        "id": "reader_agent",
                        "type": "agent",
                        "name": "文档解读专家",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "document_reader",
                            "lang": "zh",
                            "tools": ["local_knowledge"],
                            "inputs": {
                                "instruction": "{user_input}",
                                "available_doc_ids": "{context.document_ids}"
                            }
                        }
                    },
                    {"id": "end_node", "type": "end", "name": "输出摘要", "config": {}}
                ],
                "edges": [
                    {"source": "start_node", "target": "reader_agent"},
                    {"source": "reader_agent", "target": "end_node"}
                ]
            }
        }
