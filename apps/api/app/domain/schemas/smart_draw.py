from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field

class LLMConfig(BaseModel):
    type: str = Field(..., description="Provider type: 'openai' or 'anthropic'")
    baseUrl: str = Field(..., description="API Base URL")
    apiKey: str = Field(..., description="API Key")
    model: str = Field(..., description="Model name")

class MessagePart(BaseModel):
    type: str
    text: Optional[str] = None
    image_url: Optional[Dict[str, Any]] = None
    source: Optional[Dict[str, Any]] = None
    cache_control: Optional[Dict[str, Any]] = None

class Message(BaseModel):
    role: str
    content: Union[str, List[MessagePart]]
    # Optional fields for image payloads if sent separately
    image: Optional[Dict[str, Any]] = None
    images: Optional[List[Dict[str, Any]]] = None
    imagePayloads: Optional[List[Dict[str, Any]]] = None

class SmartDrawRequest(BaseModel):
    config: Optional[LLMConfig] = None
    messages: List[Message]
