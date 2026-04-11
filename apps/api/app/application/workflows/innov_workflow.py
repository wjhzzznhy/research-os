# app/application/workflows/innov_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class InnovationWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_innovation_001",
            "name": "AI 创新点推演 (系统预置)",
            "category": "innovation",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {
                        "id": "start_node",
                        "type": "start",
                        "name": "推演入口",
                        "config": {}
                    },
                    {
                        "id": "generator",
                        "type": "agent",
                        "name": "生成器 (Generator)",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "innovation_generation",
                            "lang": "zh",
                            "tools": ["academic_search", "local_knowledge"],
                            # ✨ 新增：明确绑定 generator 需要的变量
                            "inputs": {
                                "goal": "{user_input}",
                                "field": "前沿交叉学科",
                                "reasoning_type": "第一性原理与严密逻辑推演",
                                "previous_draft": "{history.generator}",
                                "literature_review": "{history.optimizer}",
                                "available_doc_ids": "{context.document_ids}",
                            }
                        }
                    },
                    {
                        "id": "critic",
                        "type": "agent",
                        "name": "审稿人 (Critic)",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "innovation_critique",
                            "lang": "zh",
                            "tools": [],
                            # ✨ 新增：明确绑定 critic 需要的变量
                            "inputs": {
                                "goal": "{user_input}",
                                "draft_markdown": "{history.generator}",
                                "simulation_result": "严格按照物理与逻辑规律推演"
                            }
                        }
                    },
                    {
                        "id": "judge_router",
                        "type": "router",
                        "name": "判决路由",
                        "config": {}
                    },
                    {
                        "id": "optimizer",
                        "type": "agent",
                        "name": "优化器 (Optimizer)",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "innovation_optimization",
                            "lang": "zh",
                            "tools": [],
                            # ✨ 新增：明确绑定 optimizer 需要的变量
                            "inputs": {
                                "goal": "{user_input}",
                                "draft_markdown": "{history.generator}",
                                "critique_feedback": "{history.critic}"
                            }
                        }
                    },
                    {
                        "id": "end_node",
                        "type": "end",
                        "name": "推演结束",
                        "config": {}
                    }
                ],
                "edges": [
                    {"source": "start_node", "target": "generator"},
                    {"source": "generator", "target": "critic"},
                    {"source": "critic", "target": "judge_router"},
                    # 匹配后端 decision 的路由条件
                    {"source": "judge_router", "target": "end_node", "condition": "及格,放行,循环上限"},
                    {"source": "judge_router", "target": "optimizer", "condition": "不及格"},
                    {"source": "optimizer", "target": "generator"}
                ]
            }
        }
