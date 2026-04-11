# app/application/agent_framework/base_agent.py
from typing import Any, Dict, List
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.runnables.config import RunnableConfig
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from app.core.logger import get_logger

logger = get_logger("base_agent")

class AgentResultWrapper:
    def __init__(self, content: str):
        self.content = content

class BaseAgent:
    def __init__(self, role_name: str, llm: BaseChatModel, system_prompt: str, tools: List[Any] = None, **kwargs):
        self.role_name = role_name
        self.llm = llm

        if hasattr(self.llm, "streaming"):
            self.llm.streaming = True

        self.temperature = kwargs.get("temperature", 0.7)
        self.max_tokens = kwargs.get("max_tokens", 2048)

        # 强制注入记忆上下文占位符
        augmented_prompt = system_prompt + "\n\n【相关背景与记忆】:\n{{ memory_context }}"
        sys_template = SystemMessagePromptTemplate.from_template(augmented_prompt, template_format="jinja2")
        human_template = HumanMessagePromptTemplate.from_template("{user_input}", template_format="f-string")

        if tools:
            self.prompt = ChatPromptTemplate.from_messages([
                sys_template,
                human_template,
                MessagesPlaceholder(variable_name="agent_scratchpad")
            ])
            agent = create_tool_calling_agent(self.llm, tools, self.prompt)
            self.chain = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)
        else:
            self.prompt = ChatPromptTemplate.from_messages([sys_template, human_template])
            self.chain = self.prompt | self.llm

    async def execute(self, inputs: Dict[str, Any], config: RunnableConfig = None) -> Any:
        logger.info(f"🤖 [{self.role_name}] 开始推理...")
        
        # 兜底记忆
        if "memory_context" not in inputs:
            inputs["memory_context"] = "无特定上下文"

        try:
            result = await self.chain.ainvoke(inputs, config=config)
            if isinstance(result, dict) and "output" in result:
                return AgentResultWrapper(result["output"])
            return result
        except Exception as e:
            logger.error(f"❌ [{self.role_name}] 报错: {str(e)}")
            raise e