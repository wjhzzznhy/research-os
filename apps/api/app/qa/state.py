from typing import Annotated, List, Union
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage, AnyMessage

# Define a standard MessagesState compatible with older and newer LangGraph versions
class MessagesState(TypedDict):
    messages: Annotated[List[AnyMessage], add_messages]
