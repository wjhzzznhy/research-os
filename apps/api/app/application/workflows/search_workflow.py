# app/application/workflows/search_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class SearchWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_search_001",
            "name": "学术与知识检索",
            "category": "search",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {"id": "start_node", "type": "start", "name": "检索入口", "config": {}},
                    {
                        "id": "search_agent",
                        "type": "agent",
                        "name": "检索分析员",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "academic_searcher",
                            "lang": "zh",
                            "tools": ["academic_search", "local_knowledge"], 
                            "inputs": {
                                "query": "{user_input}",
                                "available_doc_ids": "{context.document_ids}"
                            }
                        }
                    },
                    {"id": "end_node", "type": "end", "name": "返回结果", "config": {}}
                ],
                "edges": [
                    {"source": "start_node", "target": "search_agent"},
                    {"source": "search_agent", "target": "end_node"}
                ]
            }
        }