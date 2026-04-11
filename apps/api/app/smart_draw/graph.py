from langgraph.graph import StateGraph, END
from .state import SmartDrawState
from .nodes import analyze_intent, retrieve_icons, generate_diagram

def route_search(state: SmartDrawState):
    """
    Router to decide whether to search or skip.
    """
    if state["search_queries"]:
        return "retrieve_icons"
    return "generate_diagram"

# Create the graph
workflow = StateGraph(SmartDrawState)

# Add nodes
workflow.add_node("analyze_intent", analyze_intent)
workflow.add_node("retrieve_icons", retrieve_icons)
workflow.add_node("generate_diagram", generate_diagram)

# Set entry point
workflow.set_entry_point("analyze_intent")

# Add conditional edges
workflow.add_conditional_edges(
    "analyze_intent",
    route_search,
    {
        "retrieve_icons": "retrieve_icons",
        "generate_diagram": "generate_diagram"
    }
)

# Add standard edges
workflow.add_edge("retrieve_icons", "generate_diagram")
workflow.add_edge("generate_diagram", END)

# Compile the graph
smart_draw_graph = workflow.compile()
