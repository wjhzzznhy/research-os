# app/server/api/v1/memory.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.server.deps import get_db
from app.common.response import success_response
from app.domain.schemas.memory import MemoryCreateRequest
from app.application.services.memory_service import MemoryService

router = APIRouter()

@router.post("", summary="创建记忆")
def create_memory(body: MemoryCreateRequest, request: Request, db: Session = Depends(get_db)):
    """
    创建记忆（只支持创建长期记忆long_term）

    输入参数:
    - scope: 记忆范围
    - session_id: 会话ID
    - memory_key: 记忆键
    - content: 记忆内容
    - source: 记忆来源
    - importance_score: 重要性分数
    
    输出参数:
    - memory_id: 记忆ID
    - scope: 记忆范围
    - session_id: 会话ID
    - memory_key: 记忆键
    - content: 记忆内容
    - source: 记忆来源
    - importance_score: 重要性分数

    """
    item = MemoryService.create_memory(
        db=db,
        scope=body.scope,
        session_id=body.session_id,
        memory_key=body.memory_key,
        content=body.content,
        source=body.source,
        importance_score=body.importance_score,
    )
    return success_response(
        data={
            "memory_id": item.id,
            "scope": item.scope,
            "session_id": item.session_id,
            "memory_key": item.memory_key,
            "content": item.content,
            "source": item.source,
            "importance_score": item.importance_score,
        },
        trace_id=request.state.trace_id,
    )

@router.get("/session/{session_id}", summary="获取会话记忆")
def list_session_memory(session_id: int, request: Request, db: Session = Depends(get_db)):
    """
    根据会话id获取其对应记忆
    
    输入参数:
    - session_id: 会话ID
    
    输出参数:
    - memory_id: 记忆ID
    - scope: 记忆范围
    - session_id: 会话ID
    - memory_key: 记忆键
    - content: 记忆内容
    - source: 记忆来源
    - importance_score: 重要性分数
    """
    items = MemoryService.list_session_memory(db, session_id=session_id, limit=50)
    return success_response(
        data=[
            {
                "memory_id": item.id,
                "scope": item.scope,
                "session_id": item.session_id,
                "memory_key": item.memory_key,
                "content": item.content,
                "source": item.source,
                "importance_score": item.importance_score,
            }
            for item in items
        ],
        trace_id=request.state.trace_id,
    )


@router.get("/long-term", summary="获取长期记忆列表")
def list_long_term_memory(request: Request, limit: int = 20, db: Session = Depends(get_db)):
    """
    根据scope（重要性）排序获取长期记忆:
    
    输入参数:
    - limit (可选): 返回数量限制，默认20
    
    输出参数:
    - memory_id: 记忆ID
    - scope: 记忆范围
    - session_id: 会话ID
    - memory_key: 记忆键
    - content: 记忆内容
    - source: 记忆来源
    - importance_score: 重要性分数
    """
    items = MemoryService.list_long_term_memory(db, limit=limit)
    return success_response(
        data=[
            {
                "memory_id": item.id,
                "scope": item.scope,
                "session_id": item.session_id,
                "memory_key": item.memory_key,
                "content": item.content,
                "source": item.source,
                "importance_score": item.importance_score,
            }
            for item in items
        ],
        trace_id=request.state.trace_id,
    )


@router.get("/search", summary="全局记忆搜索")
def search_memory(keyword: str, request: Request, limit: int = 20, db: Session = Depends(get_db)):
    """
    关键词搜索所有记忆内容

    输入参数:
    - keyword: 搜索关键词
    - limit (可选): 返回数量限制，默认20
    
    输出参数:
    - memory_id: 记忆ID
    - scope: 记忆范围
    - session_id: 会话ID
    - memory_key: 记忆键
    - content: 记忆内容
    - source: 记忆来源
    - importance_score: 重要性分数
    """
    items = MemoryService.search_long_term_memory(db, keyword=keyword, limit=limit)
    return success_response(
        data=[
            {
                "memory_id": item.id,
                "scope": item.scope,
                "session_id": item.session_id,
                "memory_key": item.memory_key,
                "content": item.content,
                "source": item.source,
                "importance_score": item.importance_score,
            }
            for item in items
        ],
        trace_id=request.state.trace_id,
    )

@router.get("/search/long-term", summary="长期记忆搜索")
def search_long_term_only(keyword: str, request: Request, limit: int = 20, db: Session = Depends(get_db)):
    """
    关键词搜索，但只在长期知识库中搜索

    输入参数:
    - keyword: 搜索关键词
    - limit (可选): 返回数量限制，默认20
    
    输出参数:
    - memory_id: 记忆ID
    - scope: 记忆范围
    - session_id: 会话ID
    - memory_key: 记忆键
    - content: 记忆内容
    - source: 记忆来源
    - importance_score: 重要性分数
    """
    items = MemoryService.search_long_term_memory(db, keyword=keyword, limit=limit)
    return success_response(
        data=[
            {
                "memory_id": item.id,
                "scope": item.scope,
                "session_id": item.session_id,
                "memory_key": item.memory_key,
                "content": item.content,
                "source": item.source,
                "importance_score": item.importance_score,
            }
            for item in items
        ],
        trace_id=request.state.trace_id,
    )

@router.delete("/{memory_id}", summary="记忆遗忘 (删除)")
def delete_memory(memory_id: int, request: Request, db: Session = Depends(get_db)):
    """
    删除某条记忆（遗忘）：

    输入参数:
    - memory_id: 记忆ID
    
    输出参数:
    - message: 操作结果消息，成功时为"Memory {memory_id} deleted successfully"
    """
    MemoryService.delete_memory(db, memory_id)
    return success_response(
        data={"message": f"Memory {memory_id} deleted successfully"},
        trace_id=request.state.trace_id,
    )
