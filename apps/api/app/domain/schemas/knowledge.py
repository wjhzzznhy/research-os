from pydantic import BaseModel
from typing import List, Optional

class FileUploadStatus(BaseModel):
    filename: str
    status: str
    path: Optional[str] = None
    message: Optional[str] = None

class UploadResponse(BaseModel):
    uploaded: List[FileUploadStatus]

class SearchResult(BaseModel):
    content: str
    metadata: dict
    score: Optional[float] = None

class SearchResponse(BaseModel):
    results: List[SearchResult]
