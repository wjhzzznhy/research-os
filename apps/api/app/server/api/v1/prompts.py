# app/server/api/v1/prompts.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.server.deps import get_db
from app.domain.schemas.prompt import PromptCreate, PromptUpdate
from app.common.response import success_response
from app.application.services.prompt_service import PromptService

router = APIRouter()

# 提取一个格式化小工具，把数据库对象安全地转为 JSON 字典
def _format_prompt(prompt):
    return {
        "prompt_id": prompt.id,
        "name": prompt.name,
        "content": prompt.content,
        "category": prompt.category,
        "description": prompt.description,
        # 日期需要转成 ISO 字符串，否则 JSON 也会报错
        "created_at": prompt.created_at.isoformat() if hasattr(prompt, 'created_at') and prompt.created_at else None
    }

@router.post("", summary="新建系统提示词")
def create_prompt(prompt: PromptCreate, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - name: 提示词名称
    - content: 提示词内容
    - category: 提示词类别
    - description: 提示词描述
    
    输出参数:
    - prompt_id: 提示词ID
    - name: 提示词名称
    - content: 提示词内容
    - category: 提示词类别
    - description: 提示词描述
    - created_at: 创建时间
    """
    res = PromptService.create(db, prompt)
    return success_response(data=_format_prompt(res), trace_id=request.state.trace_id)

@router.get("", summary="获取提示词列表")
def list_prompts(request: Request, category: str | None = None, db: Session = Depends(get_db)):
    """
    输入参数:
    - category (可选): 提示词类别，用于筛选
    
    输出参数:
    - prompt_id: 提示词ID
    - name: 提示词名称
    - content: 提示词内容
    - category: 提示词类别
    - description: 提示词描述
    - created_at: 创建时间
    """
    res = PromptService.list(db, category)
    return success_response(data=[_format_prompt(item) for item in res], trace_id=request.state.trace_id)

@router.get("/{prompt_id}", summary="获取单条提示词内容")
def get_prompt(prompt_id: str, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - prompt_id: 提示词ID
    
    输出参数:
    - prompt_id: 提示词ID
    - name: 提示词名称
    - content: 提示词内容
    - category: 提示词类别
    - description: 提示词描述
    - created_at: 创建时间
    """
    res = PromptService.get(db, prompt_id)
    return success_response(data=_format_prompt(res), trace_id=request.state.trace_id)

@router.put("/{prompt_id}", summary="修改系统提示词")
def update_prompt(prompt_id: str, prompt: PromptUpdate, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - prompt_id: 提示词ID
    - name (可选): 提示词名称
    - content (可选): 提示词内容
    - category (可选): 提示词类别
    - description (可选): 提示词描述
    
    输出参数:
    - prompt_id: 提示词ID
    - name: 提示词名称
    - content: 提示词内容
    - category: 提示词类别
    - description: 提示词描述
    - created_at: 创建时间
    """
    res = PromptService.update(db, prompt_id, prompt)
    return success_response(data=_format_prompt(res), trace_id=request.state.trace_id)

@router.delete("/{prompt_id}", summary="删除提示词")
def delete_prompt(prompt_id: str, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - prompt_id: 提示词ID
    """
    PromptService.delete(db, prompt_id)
    return success_response(data={"message": "Prompt deleted"}, trace_id=request.state.trace_id)
