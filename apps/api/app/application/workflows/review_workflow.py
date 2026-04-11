# app/application/workflows/review_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class ReviewWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_review_001",
            "name": "文献综述分析器",
            "category": "review",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {"id": "start_node", "type": "start", "name": "综述主题", "config": {}},
                    {
                        "id": "reviewer_agent",
                        "type": "agent",
                        "name": "综述分析师",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "review_analyzer",
                            "lang": "zh",
                            "tools": ["academic_search", "local_knowledge"], 
                            "inputs": {
                                "research_topic": "{user_input}",
                                "available_doc_ids": "{context.document_ids}"
                            }
                        }
                    },
                    {"id": "end_node", "type": "end", "name": "输出综述", "config": {}}
                ],
                "edges": [
                    {"source": "start_node", "target": "reviewer_agent"},
                    {"source": "reviewer_agent", "target": "end_node"}
                ]
            }
        }