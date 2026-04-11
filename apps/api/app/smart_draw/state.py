from typing import TypedDict, List, Annotated, Dict, Any, Optional
import operator
from langchain_core.messages import BaseMessage

class SmartDrawState(TypedDict):
    """
    State for the Smart Draw LangGraph workflow.
    """
    messages: Annotated[List[BaseMessage], operator.add]
    user_intent: Optional[str]
    search_queries: List[str]
    found_icons: List[Dict[str, Any]]
    final_output: Optional[str]
    llm_config: Dict[str, str]  # To pass API keys and model info
