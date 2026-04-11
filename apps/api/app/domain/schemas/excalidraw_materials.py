from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ExcalidrawVectorItem(BaseModel):
    id: str
    scene_id: str
    element_id: str
    element_type: str
    score: Optional[float] = None
    name: Optional[str] = None
    url: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}


class ExcalidrawSearchResponse(BaseModel):
    items: List[ExcalidrawVectorItem]
    total: int


class ExcalidrawSceneEntry(BaseModel):
    scene_id: str
    display_name: str
    url: str
    object_name: str
    preview_image_url: Optional[str] = None
    preview_image_object_name: Optional[str] = None
    created: int
    updated: int
    elements_count: int
    tags: List[str] = []
    category: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    deleted: bool = False


class ExcalidrawSceneUploadResponse(BaseModel):
    scene: ExcalidrawSceneEntry
    indexed_docs: int


class ExcalidrawSceneSearchItem(BaseModel):
    scene: ExcalidrawSceneEntry
    score: float
    metadata: Dict[str, Any] = {}


class ExcalidrawSceneSearchResponse(BaseModel):
    items: List[ExcalidrawSceneSearchItem]
    total: int
