import json
import logging
from typing import AsyncGenerator, List, Dict, Any, Union

import httpx
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.domain.schemas.smart_draw import LLMConfig, Message, MessagePart

logger = logging.getLogger(__name__)


def normalize_base_url(url: str) -> str:
    url = url.strip()
    if not url:
        return url
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    return url.rstrip("/")


def extract_text_from_content(content: Union[str, List[Any]]) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = [p.text for p in content if hasattr(p, 'text') and p.text]
        if not text_parts:
            text_parts = [p.get('text') for p in content if isinstance(p, dict) and p.get('type') == 'text']
        return "".join(text_parts)
    return ""


def process_message_for_openai(message: Message) -> Dict[str, Any]:
    if not message.image and not message.images and not message.imagePayloads:
        if isinstance(message.content, str):
            return {"role": message.role, "content": message.content}
        return {"role": message.role, "content": message.dict(exclude_none=True).get("content")}

    images = []
    if message.images:
        images.extend(message.images)
    elif message.image:
        images.append(message.image)

    if message.imagePayloads:
        images.extend(message.imagePayloads)

    content_parts = []

    text_content = extract_text_from_content(message.content)
    if text_content:
        content_parts.append({"type": "text", "text": text_content})

    for img in images:
        mime_type = img.get("mimeType") or img.get("media_type") or img.get("type") or "image/png"
        data = img.get("data")
        if data:
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{data}",
                    "detail": "high"
                }
            })

    return {
        "role": message.role,
        "content": content_parts
    }


def process_message_for_anthropic(message: Message) -> Dict[str, Any]:
    role = "assistant" if message.role == "assistant" else "user"
    content_parts = []

    text_content = extract_text_from_content(message.content)
    if text_content:
        content_parts.append({"type": "text", "text": text_content})

    images = []
    if message.images:
        images.extend(message.images)
    elif message.image:
        images.append(message.image)
    if message.imagePayloads:
        images.extend(message.imagePayloads)

    for img in images:
        mime_type = img.get("mimeType") or img.get("media_type") or img.get("type") or "image/png"
        data = img.get("data")
        if data:
            content_parts.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": data
                }
            })

    if not content_parts:
        content_parts.append({"type": "text", "text": ""})

    return {
        "role": role,
        "content": content_parts
    }


async def _stream_response_generator(response, provider_name: str, is_anthropic: bool = False) -> AsyncGenerator[str, None]:
    if response.status_code != 200:
        error_text = await response.aread()
        yield f"data: {json.dumps({'error': f'{provider_name} API error: {response.status_code} {error_text.decode()}'})}\n\n"
        return

    async for line in response.aiter_lines():
        if not line:
            continue
        if line.startswith("data: "):
            data_str = line[6:]
            if data_str.strip() == "[DONE]":
                yield "data: [DONE]\n\n"
                continue
            try:
                data_json = json.loads(data_str)
                if is_anthropic:
                    if data_json.get("type") == "content_block_delta":
                        content = data_json.get("delta", {}).get("text")
                        if content:
                            yield f"data: {json.dumps({'content': content})}\n\n"
                else:
                    content = data_json.get("choices", [{}])[0].get("delta", {}).get("content")
                    if content:
                        yield f"data: {json.dumps({'content': content})}\n\n"
            except json.JSONDecodeError:
                continue

    if is_anthropic:
        yield "data: [DONE]\n\n"


async def call_google(api_key: str, model: str, messages: List[Message]) -> AsyncGenerator[str, None]:
    if not model:
        model = "gemini-pro"

    chat = ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key,
        streaming=True,
        convert_system_message_to_human=True
    )

    lc_messages = []
    for msg in messages:
        content_str = ""
        if isinstance(msg.content, str):
            content_str = msg.content
        elif isinstance(msg.content, list):
            for part in msg.content:
                if isinstance(part, MessagePart) and part.type == 'text' and part.text:
                    content_str += part.text
                elif isinstance(part, dict) and part.get('type') == 'text':
                    content_str += part.get('text', '')

        if msg.role == "user":
            lc_messages.append(HumanMessage(content=content_str))
        elif msg.role == "assistant":
            lc_messages.append(AIMessage(content=content_str))
        elif msg.role == "system":
            lc_messages.append(SystemMessage(content=content_str))

    try:
        async for chunk in chat.astream(lc_messages):
            if chunk.content:
                yield f"data: {json.dumps({'content': chunk.content})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': f'Google API error: {str(e)}'})}\n\n"


async def call_openai(base_url: str, api_key: str, model: str, messages: List[Message]) -> AsyncGenerator[str, None]:
    url = f"{normalize_base_url(base_url)}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    processed_messages = [process_message_for_openai(msg) for msg in messages]

    payload = {
        "model": model,
        "messages": processed_messages,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                async for chunk in _stream_response_generator(response, "OpenAI"):
                    yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def call_anthropic(base_url: str, api_key: str, model: str, messages: List[Message]) -> AsyncGenerator[str, None]:
    url = f"{normalize_base_url(base_url)}/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }

    system_message = next((m for m in messages if m.role == "system"), None)
    chat_messages = [m for m in messages if m.role != "system"]
    processed_messages = [process_message_for_anthropic(m) for m in chat_messages]

    payload = {
        "model": model,
        "messages": processed_messages,
        "stream": True,
        "temperature": 1,
        "max_tokens": 4096
    }

    if system_message:
        text = extract_text_from_content(system_message.content)
        if text:
            payload["system"] = text

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                async for chunk in _stream_response_generator(response, "Anthropic", is_anthropic=True):
                    yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def fetch_models(base_url: str, api_key: str, provider_type: str):
    base = normalize_base_url(base_url)
    url = f"{base}/models"

    if provider_type == "anthropic":
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
    else:
        headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                models_list = []
                if isinstance(data, dict):
                    if "data" in data and isinstance(data["data"], list):
                        models_list = data["data"]
                    elif "models" in data and isinstance(data["models"], list):
                        models_list = data["models"]
                elif isinstance(data, list):
                    models_list = data

                results = []
                for m in models_list:
                    if isinstance(m, str):
                        results.append({"id": m, "name": m})
                    elif isinstance(m, dict):
                        mid = m.get("id") or m.get("name") or m.get("model") or m.get("slug")
                        mname = m.get("name") or m.get("id") or m.get("model") or m.get("slug")
                        if mid:
                            results.append({"id": mid, "name": mname})

                return {"models": results}
            else:
                return {"error": f"Provider error: {response.text}"}
        except Exception as e:
            return {"error": f"Connection error: {str(e)}"}
