# app/application/workflows/drawing_workflow.py
from app.application.agent_framework.base_graph import BaseGraph

class DrawingWorkflow(BaseGraph):
    @classmethod
    def get_default_config(cls) -> dict:
        return {
            "id": "sys_drawing_001",
            "name": "图像生成工作流",
            "category": "drawing",
            "is_system": True,
            "graph_config": {
                "nodes": [
                    {"id": "start_node", "type": "start", "name": "描述入口", "config": {}},
                    {
                        "id": "drawing_agent",
                        "type": "agent",
                        "name": "绘图师",
                        "config": {
                            "model": "qwen-plus",
                            "prompt_name": "image_generator",
                            "lang": "zh",
                            # TODO: 挂载一个真正的 image_generation_tool 挂在这里 或 包装转接外部服务
                            "tools": [], 
                            "inputs": {"image_prompt": "{user_input}"}
                        }
                    },
                    {"id": "end_node", "type": "end", "name": "输出图像", "config": {}}
                ],
                "edges": [
                    {"source": "start_node", "target": "drawing_agent"},
                    {"source": "drawing_agent", "target": "end_node"}
                ]
            }
        }
