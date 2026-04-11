import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from app.application.services.icon import icon_service
from .state import SmartDrawState

async def analyze_intent(state: SmartDrawState):
    """
    Analyzes the user's request to determine if icon search is needed.
    Uses few-shot examples for reliable structured output.
    """
    messages = state["messages"]
    llm_config = state["llm_config"]
    
    llm = ChatOpenAI(
        base_url=f"{llm_config['base_url']}",
        api_key=llm_config['api_key'],
        model=llm_config['model'],
        temperature=0
    )

    system_prompt = """<role>You are an intent classifier for a diagramming tool. Decide if the user's diagram request requires specific technical icons.</role>

<rules>
- Return {"search": false} for: generic shapes, abstract concepts, simple flowcharts, organizational charts without tech
- Return {"search": true, "queries": [...]} for: specific technologies, frameworks, cloud services, databases
- Extract ONLY proper nouns of technologies as queries (e.g. "Redis", "React", "AWS EC2")
- Do NOT extract generic terms like "database", "server", "API", "frontend"
- If uncertain, return {"search": false}
</rules>

<examples>
Input: "Draw a flowchart for user registration"
Output: {"search": false}

Input: "Create a microservices architecture with Redis, Kafka, and PostgreSQL"
Output: {"search": true, "queries": ["Redis", "Kafka", "PostgreSQL"]}

Input: "Visualize the software development lifecycle"
Output: {"search": false}

Input: "AWS architecture with EC2, S3, and Lambda"
Output: {"search": true, "queries": ["AWS EC2", "AWS S3", "AWS Lambda"]}
</examples>

Return PURE JSON without markdown fences."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("user", "{input}")
    ])
    
    last_user_msg = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    if not last_user_msg:
        return {"search_queries": []}

    chain = prompt | llm
    
    try:
        response = await chain.ainvoke({"input": last_user_msg.content})
        content = response.content.replace("```json", "").replace("```", "").strip()
        result = json.loads(content)
        
        if result.get("search"):
            return {"search_queries": result.get("queries", [])}
    except Exception as e:
        print(f"Intent analysis error: {e}")
        
    return {"search_queries": []}

async def retrieve_icons(state: SmartDrawState):
    """
    Retrieves icons from the vector store based on search queries.
    """
    queries = state["search_queries"]
    all_found_icons = []
    seen_ids = set()
    
    for query in queries:
        results = await icon_service.search_by_text(query, top_k=2)
        for icon_result in results:
            icon = icon_result.icon
            if icon.id not in seen_ids:
                all_found_icons.append({
                    "id": icon.id,
                    "name": icon.name,
                    "url": f"/api/v1/icons/file/{icon.render_file_path}",
                    "style": icon.style,
                    "tags": icon.tags_manual,
                    "_score": icon_result.similarity,
                })
                seen_ids.add(icon.id)
                
    return {"found_icons": all_found_icons}

async def generate_diagram(state: SmartDrawState):
    """
    Generates the final diagram code (XML/JSON) with injected icon context.
    Provides explicit usage examples for reliable integration.
    """
    found_icons = state.get("found_icons", [])
    
    if found_icons:
        icon_context = "\n\n<icon_assets>\n"
        icon_context += "The following verified icon assets match the user's request.\n"
        icon_context += "You MUST use these icons as image elements with the exact URLs below.\n"
        icon_context += "Place icons alongside their labels using the coordinate system.\n\n"

        for icon in found_icons:
            score = icon.get('_score', 0)
            url = icon.get('url')
            name = icon.get('name')
            icon_context += f'<asset name="{name}" relevance="{score:.2f}">\n'
            icon_context += f'  <url>{url}</url>\n'
            icon_context += f'  <usage>{{ "type": "image", "fileId": "{url}", "width": 80, "height": 80 }}</usage>\n'
            icon_context += f'</asset>\n'

        icon_context += "</icon_assets>"
        return {"messages": [SystemMessage(content=icon_context)]}
    
    return {}
