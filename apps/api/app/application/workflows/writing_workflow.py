# app/application/workflows/writing_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class WritingWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_writing_001",
            "name": "长文写作助手",
            "category": "writing",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {"id": "start_node", "type": "start", "name": "主题入口", "config": {}},
                    {
                        "id": "writer_agent",
                        "type": "agent",
                        "name": "主笔作家",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "paper_writer",
                            "lang": "zh",
                            "tools": ["academic_search", "local_knowledge"], 
                            "inputs": {
                                "topic": "{user_input}",
                                "available_doc_ids": "{context.document_ids}"
                            }
                        }
                    },
                    {"id": "end_node", "type": "end", "name": "成文", "config": {}}
                ],
                "edges": [
                    {"source": "start_node", "target": "writer_agent"},
                    {"source": "writer_agent", "target": "end_node"}
                ]
            }
        }
