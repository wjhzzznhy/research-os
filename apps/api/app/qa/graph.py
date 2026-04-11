from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from .nodes import agent_node, tools
from .state import MessagesState

# Define the graph
workflow = StateGraph(MessagesState)

# Add nodes
workflow.add_node("agent", agent_node)
workflow.add_node("tools", ToolNode(tools))

# Add edges
workflow.set_entry_point("agent")

# Conditional edge: agent -> (tools or END)
workflow.add_conditional_edges(
    "agent",
    tools_condition,
)

# Edge: tools -> agent
workflow.add_edge("tools", "agent")

qa_graph = workflow.compile()
