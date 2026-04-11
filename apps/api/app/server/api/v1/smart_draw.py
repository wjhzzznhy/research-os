import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.core.config import settings
from app.domain.schemas.smart_draw import SmartDrawRequest, LLMConfig, Message
from app.application.services.smart_draw_llm import (
    call_openai,
    call_anthropic,
    call_google,
    fetch_models,
    normalize_base_url,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/models")
async def list_models(type: str, baseUrl: str, apiKey: str):
    result = await fetch_models(baseUrl, apiKey, type)
    if "error" in result:
        return JSONResponse(status_code=500, content=result)
    return result


@router.post("/test")
async def test_connection(config: LLMConfig):
    try:
        if config.type == "openai":
            await fetch_models(config.baseUrl, config.apiKey, config.type)
            return {"message": "Connection successful"}

        elif config.type == "anthropic":
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{normalize_base_url(config.baseUrl)}/messages"
                headers = {
                    "Content-Type": "application/json",
                    "x-api-key": config.apiKey,
                    "anthropic-version": "2023-06-01"
                }
                payload = {
                    "model": config.model,
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 1
                }
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    return {"message": "Connection successful"}
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Anthropic error: {response.text}"
                    )

        return {"message": "Connection test passed (no specific check for this type)"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")


@router.post("/config")
async def get_server_config(
    x_access_password: Optional[str] = Header(None, alias="x-access-password")
):
    if not x_access_password:
        raise HTTPException(status_code=400, detail="Missing access password")

    env_password = settings.SMART_DRAW_ACCESS_PASSWORD
    if not env_password:
        raise HTTPException(status_code=400, detail="Server password not configured")

    if x_access_password != env_password:
        raise HTTPException(status_code=401, detail="Invalid access password")

    return {
        "success": True,
        "config": {
            "type": settings.SMART_DRAW_SERVER_LLM_TYPE,
            "baseUrl": settings.SMART_DRAW_SERVER_LLM_BASE_URL,
            "model": settings.SMART_DRAW_SERVER_LLM_MODEL,
        }
    }


@router.post("/generate", response_model=None)
async def smart_draw_generate(request: SmartDrawRequest):
    if request.config and request.config.type:
        final_config = request.config
        if not final_config.apiKey:
            raise HTTPException(status_code=400, detail="Invalid config: missing apiKey")
    else:
        final_config = LLMConfig(
            type="openai",
            baseUrl=settings.SMART_DRAW_SERVER_LLM_BASE_URL,
            apiKey=settings.SMART_DRAW_SERVER_LLM_API_KEY,
            model=settings.SMART_DRAW_SERVER_LLM_MODEL
        )
        if not final_config.apiKey:
            raise HTTPException(status_code=500, detail="Server LLM config incomplete")

    lc_messages = []
    for msg in request.messages:
        content_str = ""
        if isinstance(msg.content, str):
            content_str = msg.content
        elif isinstance(msg.content, list):
            for part in msg.content:
                if isinstance(part, dict) and part.get('type') == 'text':
                    content_str += part.get('text', '')
                elif hasattr(part, 'type') and part.type == 'text':
                    content_str += part.text

        if msg.role == "user":
            lc_messages.append(HumanMessage(content=content_str))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=content_str))
        elif msg.role == "system":
            lc_messages.append(SystemMessage(content=content_str))

    try:
        from app.smart_draw.graph import smart_draw_graph

        initial_state = {
            "messages": lc_messages,
            "llm_config": {
                "base_url": normalize_base_url(final_config.baseUrl),
                "api_key": final_config.apiKey,
                "model": final_config.model
            },
            "search_queries": [],
            "found_icons": []
        }

        final_state = await smart_draw_graph.ainvoke(initial_state)

        graph_messages = final_state["messages"]

        if isinstance(graph_messages[-1], SystemMessage) and "<icon_assets>" in str(graph_messages[-1].content):
            injected_content = graph_messages[-1].content
            last_user_msg = next((m for m in reversed(request.messages) if m.role == "user"), None)
            if last_user_msg:
                if isinstance(last_user_msg.content, str):
                    last_user_msg.content += injected_content
                elif isinstance(last_user_msg.content, list):
                    last_user_msg.content.append({"type": "text", "text": injected_content})
                logger.info("Context injected from LangGraph")

    except Exception as e:
        logger.warning(f"LangGraph execution failed: {e}")

    if final_config.type == "openai":
        return StreamingResponse(
            call_openai(final_config.baseUrl, final_config.apiKey, final_config.model, request.messages),
            media_type="text/event-stream"
        )
    elif final_config.type == "anthropic":
        return StreamingResponse(
            call_anthropic(final_config.baseUrl, final_config.apiKey, final_config.model, request.messages),
            media_type="text/event-stream"
        )
    elif final_config.type == "google":
        return StreamingResponse(
            call_google(final_config.apiKey, final_config.model, request.messages),
            media_type="text/event-stream"
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported provider type: {final_config.type}")
