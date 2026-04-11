from typing import List, Annotated
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from app.core.config import settings
from .tools import SearchIconsTool
from .state import MessagesState

search_tool = SearchIconsTool()
tools = [search_tool]

api_key = settings.OPENAI_API_KEY or "sk-proj-dummy-key-for-startup"

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0,
    api_key=api_key,
    base_url=settings.OPENAI_BASE_URL,
).bind_tools(tools)

system_prompt = (
    "你是科研助手，负责基于图标库回答用户问题。\n"
    "流程：\n"
    "1. 除非用户只是在闲聊，否则请优先调用 search_icons 工具检索相关图标。\n"
    "2. 拿到检索结果后，基于事实回答。\n"
    "3. 如果回答中需要引用某个图标，请在句尾用 (source: id=..., name=...) 形式标注。\n"
    "4. 用中文回答，尽量简洁。"
)

async def agent_node(state: MessagesState):
    messages = state["messages"]
    if not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=system_prompt)] + messages
    
    response = await llm.ainvoke(messages)
    return {"messages": [response]}
