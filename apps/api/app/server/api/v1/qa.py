from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from app.qa.graph import qa_graph
from app.core.config import settings


router = APIRouter()


class QAAskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(8, ge=1, le=50)


class QASource(BaseModel):
    id: str
    name: str
    url: str
    style: Optional[str] = None
    tags: Optional[List[str]] = []
    similarity: Optional[float] = None


class QAAskResponse(BaseModel):
    answer: str
    sources: List[QASource]


@router.post("/ask", response_model=QAAskResponse)
async def ask(req: QAAskRequest):
    hint_parts = []
    if req.top_k != 8:
        hint_parts.append(f"retrieve top {req.top_k} results")
    
    user_content = req.question
    if hint_parts:
        user_content += f"\n(Note: Please {', '.join(hint_parts)} when searching)"

    state = {
        "messages": [HumanMessage(content=user_content)],
    }
    result = await qa_graph.ainvoke(state)
    messages = result.get("messages", [])
    
    answer = ""
    if messages and isinstance(messages[-1], AIMessage):
        answer = str(messages[-1].content)

    icons = []
    seen_ids = set()
    
    for msg in messages:
        if isinstance(msg, ToolMessage) and msg.artifact:
            if isinstance(msg.artifact, list):
                for icon_result in msg.artifact:
                    if hasattr(icon_result, 'icon'):
                        icon = icon_result.icon
                        mid = icon.id
                        if mid and mid not in seen_ids:
                            icons.append({
                                "id": icon.id,
                                "name": icon.name,
                                "url": f"/api/v1/icons/file/{icon.render_file_path}",
                                "style": icon.style,
                                "tags": icon.tags_manual,
                                "similarity": icon_result.similarity,
                            })
                            seen_ids.add(mid)

    sources = [QASource(**icon) for icon in icons]

    return {"answer": answer, "sources": sources}
