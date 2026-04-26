# app/application/agent_framework/compiler.py
import operator
from typing import TypedDict, Annotated, Dict, Any, List
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END
from langchain_core.runnables.config import RunnableConfig

from app.core.agents import get_llm
from app.core.logger import get_logger
from app.application.services.prompt_service import PromptService
from app.application.agent_framework.base_agent import BaseAgent
from app.application.agent_framework.tool_factory import ToolFactory
from app.application.agent_framework.state_manager import StateManager
from app.core.prompt_fallback import get_fallback_prompt

logger = get_logger("workflow_compiler")

class DynamicState(TypedDict):
    history: Annotated[List[Dict[str, Any]], operator.add]
    input: str
    context: Dict[str, Any]

class WorkflowCompiler:
    def __init__(self, db: Session, workflow_json: dict):
        self.db = db
        self.nodes = workflow_json.get("nodes", [])
        self.edges = workflow_json.get("edges", [])
        self.graph = StateGraph(DynamicState)
        self.state_manager = StateManager()
        self.entry_point = None

    def _resolve_prompt(self, config_data: dict) -> str:
        """
        从配置中解析提示词，优先查查数据库 (prompt_id)，若无则查本地 MD 文件 (prompt_name)
        :param config_data: 节点配置数据
        :return: 系统提示词
        """
        inline_prompt = config_data.get("system_prompt") or config_data.get("prompt")
        if inline_prompt:
            return inline_prompt

        prompt_id = config_data.get("prompt_id")
        prompt_name = config_data.get("prompt_name") 
        lang = config_data.get("lang", "zh") # 支持图纸配置语言

        # 1: 尝试去数据库查
        if prompt_id:
            try:
                db_prompt = PromptService.get(self.db, prompt_id)
                return db_prompt.content
            except Exception as e:
                logger.warning(f"⚠️ 无法从数据库加载 Prompt ID '{prompt_id}' ({str(e)})，触发本地降级机制...")

        # 2: 数据库失败或没传ID，尝试读取本地 .md 兜底文件
        # 优先用 prompt_name 找文件，如果没有就尝试把 prompt_id 当文件名碰碰运气
        fallback_key = prompt_name or prompt_id
        if fallback_key:
            local_content = get_fallback_prompt(fallback_key, lang=lang)
            if local_content:
                return local_content

        # 3: 终极兜底
        logger.warning(f"🚨 数据库与本地文件均未命中 (key: {fallback_key})，触发终极安全兜底")
        return "你是一个AI助手。"

    def _build_dynamic_inputs(self, state: DynamicState, config_data: dict) -> dict:
        """
        通用的动态上下文注入器，模板 JSON 中的 inputs 配置驱动。
        """
        inputs_config = config_data.get("inputs", {})
        resolved_inputs = {}
        
        for k, v_template in inputs_config.items():
            if isinstance(v_template, str) and v_template.startswith("{") and v_template.endswith("}"):
                path = v_template[1:-1]  # 去掉大括号，如 'history.generator' 或 'context.document_ids'
                parts = path.split(".")
                root_key = parts[0]
                
                if root_key == "user_input":
                    resolved_inputs[k] = state.get("input", "")
                elif root_key == "history":
                    # 处理 history.xxx 的逻辑保持不变...
                    node_name = parts[1] if len(parts) > 1 else None
                    if not node_name:
                        resolved_inputs[k] = str(state.get("history", []))
                    else:
                        history_list = state.get("history", [])
                        matches = [item for item in history_list if item.get("role") == node_name]
                        if matches:
                            resolved_inputs[k] = matches[-1].get("content", "")
                        else:
                            resolved_inputs[k] = "首次推演，暂无历史内容"
                            
                elif root_key == "context":
                    # 处理从 context 中提取数据的逻辑
                    ctx = state.get("context", {})
                    if len(parts) > 1:
                        target_key = parts[1]
                        val = ctx.get(target_key)
                        # 如果是列表，转成逗号分隔的字符串，方便大模型阅读
                        if isinstance(val, list):
                            resolved_inputs[k] = ", ".join(val)
                        else:
                            resolved_inputs[k] = str(val) if val is not None else "无"
                    else:
                        resolved_inputs[k] = str(ctx)

            else:
                resolved_inputs[k] = v_template

        # 保留记忆注入
        resolved_inputs["memory_context"] = "无特定上下文"
        resolved_inputs["user_input"] = state.get("input", "")
        return resolved_inputs

    def _create_agent_node(self, node_config: dict):
        node_id = node_config["id"]
        config_data = node_config.get("config", {})

        async def runner(state: DynamicState, config: RunnableConfig):        
            # 1. 动态装配
            model_name = config_data.get("model", "qwen-plus") 
            temperature = config_data.get("temperature", 0.7) # 动态读取温度
            max_tokens = config_data.get("max_tokens", 2048)
            system_prompt = self._resolve_prompt(config_data)
            tool_names = config_data.get("tools", [])
            
            # 从工厂拉取工具，从核心层获取大模型
            tools = ToolFactory.create_tools_from_names(self.db, tool_names)
            llm = get_llm(model_name=model_name)
            agent = BaseAgent(role_name=node_id, llm=llm, system_prompt=system_prompt, tools=tools, temperature=temperature, max_tokens=max_tokens)

            # 2. 执行与记忆注入
            inputs = self._build_dynamic_inputs(state, config_data)
            response = await agent.execute(inputs, config)
            content = response.content

            # 3. 状态与打分管家介入
            current_score = self.state_manager.extract_score(content)
            self.state_manager.append_node(draft_content=content, score=current_score)

            # 4. 路由与防爆熔断计算
            if self.state_manager.current_iteration >= 8:
                logger.warning(f"🚨 [防爆熔断] 节点 {node_id} 循环达到上限，强行放行")
                decision = "循环上限"
            elif current_score >= 80:
                decision = "及格"
            elif current_score == 0.0 and node_id != "critic":
                decision = "放行" # 兼容普通无打分节点
            else:
                decision = "不及格"

            return {
                "history": [{"role": node_id, "content": content}],
                "context": {
                    "last_node": node_id, 
                    "router_decision": decision,
                    "best_score": self.state_manager.get_best_node().score if self.state_manager.get_best_node() else 0
                }
            }
        return runner

    def _create_router_evaluator(self, out_edges: list):
        """路由条件判定器"""
        def evaluator(state: DynamicState) -> str:
            logger.info(f"==> 经过 Router 路由节点: {out_edges}")
            decision = state.get("context", {}).get("router_decision", "")
            for edge in out_edges:
                condition = edge.get("condition", "")
                if decision in condition:   # 如果后端出的 decision 包含在连线的 condition 字符串里
                    return edge["target"]
            return out_edges[0]["target"] if out_edges else END
        return evaluator

    @staticmethod
    def _pass_through_node(state: DynamicState) -> dict:
        # Reducer fields such as history must not be returned unchanged,
        # otherwise LangGraph will append the same history again.
        return {}

    def compile(self):
        """主编译过程：将 JSON 解析为 LangGraph 实例"""
        # 1. 遍历并注册所有节点
        for node in self.nodes:
            n_id = node["id"]
            n_type = node.get("type", "agent")
            
            if n_type == "start":
                self.entry_point = n_id
                # start 节点只是个入口，直接放行 (Pass-through)
                self.graph.add_node(n_id, self._pass_through_node)
            elif n_type == "agent":
                # 真正的 AI 节点，挂载我们写好的大模型执行器
                self.graph.add_node(n_id, self._create_agent_node(node))
            elif n_type == "router":
                # 路由节点在 LangGraph 中本质也是个空节点，靠后面的 conditional_edges 决定方向
                self.graph.add_node(n_id, self._pass_through_node)
            elif n_type == "end":
                self.graph.add_node(n_id, self._pass_through_node)

        # 2. 遍历并注册所有连线
        for node in self.nodes:
            n_id = node["id"]
            n_type = node.get("type", "agent")
            # 找到所有从当前节点出发的边
            out_edges = [e for e in self.edges if e["source"] == n_id]
            
            if not out_edges:
                continue

            if n_type == "router":
                # 如果是路由器，需要添加条件边
                # target_map 告诉 LangGraph：当判定器返回某个目标 ID 时，就走向那个 ID
                target_map = {edge["target"]: edge["target"] for edge in out_edges}
                self.graph.add_conditional_edges(
                    n_id,
                    self._create_router_evaluator(out_edges), # 调用判定器
                    target_map
                )
            else:
                # 如果是普通节点（start/agent），直接连向它的目标
                target = out_edges[0]["target"]
                self.graph.add_edge(n_id, target)

        # 3. 设定入口点并编译图
        if not self.entry_point:
            raise ValueError("图纸中缺失类型为 'start' 的起点节点！")
        self.graph.set_entry_point(self.entry_point)

        return self.graph.compile()
