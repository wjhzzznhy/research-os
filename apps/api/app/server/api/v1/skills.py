# app/server/api/v1/skills.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.server.deps import get_db
from app.common.response import success_response
from app.domain.schemas.skill import SkillInvokeRequest, SkillCreate, SkillUpdate
from app.application.services.skill_service import SkillService

router = APIRouter()

@router.get("",summary="获取技能列表")
def list_skills(request: Request, db: Session = Depends(get_db)):
    """
    在管理后台表格中展示所有已注册的工具及其配置。
    
    输出参数:
    - skill_id: 技能ID
    - name: 技能名称
    - display_name: 显示名称
    - description: 技能描述
    - is_enabled: 是否启用
    - skill_type: 技能类型
    - api_url: API地址
    - api_method: API方法
    - input_schema: 输入模式
    - output_schema: 输出模式
    """
    items = SkillService.list_skills(db)
    return success_response(
        data=[
            {
                "skill_id": item.id,
                "name": item.name,
                "display_name": item.display_name,
                "description": item.description,
                "is_enabled": item.is_enabled,
                "skill_type": item.skill_type,
                "api_url": item.api_url,
                "api_method": item.api_method,
                "input_schema": item.input_schema,
                "output_schema": item.output_schema
            }
            for item in items
        ],
        trace_id=request.state.trace_id,
    )

@router.post("/{skill_name}/invoke", summary="根据技能名称触发技能执行")
def invoke_skill(skill_name: str, body: SkillInvokeRequest, request: Request, db: Session = Depends(get_db)):
    """ 
    输入参数:
    - skill_name: 技能名称
    - payload: 技能执行参数
    
    输出参数:
    - 技能执行结果，具体结构取决于技能实现
    """
    result = SkillService.invoke_skill(db, skill_name, body.payload or {})
    return success_response(data=result, trace_id=request.state.trace_id)

@router.put("/{skill_id}", summary="根据技能ID更新对应技能配置")
def update_skill(skill_id: int, body: SkillUpdate, request: Request, db: Session = Depends(get_db)):
    """   
    输入参数:
    - skill_id: 技能ID
    - display_name (可选): 显示名称
    - description (可选): 技能描述
    - is_enabled (可选): 是否启用
    - api_url (可选): API地址
    - api_method (可选): API方法
    - input_schema (可选): 输入模式
    - output_schema (可选): 输出模式
    
    输出参数:
    - skill_id: 技能ID
    - name: 技能名称
    - skill_type: 技能类型
    """
    updated_skill = SkillService.update_skill(db, skill_id, body.model_dump(exclude_unset=True))
    return success_response(
        data={
            "skill_id": updated_skill.id, 
            "name": updated_skill.name,
            "skill_type": updated_skill.skill_type
        }, 
        trace_id=request.state.trace_id
    )

@router.get("/{skill_id}", summary="根据技能ID获取对应技能详情")
def get_skill(skill_id: int, request: Request, db: Session = Depends(get_db)):
    """
    输入参数:
    - skill_id: 技能ID
    
    输出参数:
    - skill_id: 技能ID
    - skill_name: 技能名称
    - display_name: 显示名称
    - description: 技能描述
    - is_enabled: 是否启用
    - skill_type: 技能类型
    - api_url: API地址
    - api_method: API方法
    - input_schema: 输入模式
    - output_schema: 输出模式
    """
    item = SkillService.get_skill_by_id(db, skill_id)
    return success_response(
        data={
            "skill_id": item.id,
            "skill_name": item.name,
            "display_name": item.display_name,
            "description": item.description,
            "is_enabled": item.is_enabled,
            "skill_type": item.skill_type,
            "api_url": item.api_url,
            "api_method": item.api_method,
            "input_schema": item.input_schema,
            "output_schema": item.output_schema
        },
        trace_id=request.state.trace_id
    )

@router.post("", summary="新增技能配置")
def create_skill(body: SkillCreate, request: Request, db: Session = Depends(get_db)):
    """    
    输入参数:
    - name: 技能名称
    - display_name: 显示名称
    - description: 技能描述
    - is_enabled: 是否启用
    - skill_type: 技能类型
    - api_url: API地址
    - api_method: API方法
    - input_schema: 输入模式
    - output_schema: 输出模式
    
    输出参数:
    - id: 技能ID
    - name: 技能名称
    - display_name: 显示名称
    - skill_type: 技能类型
    """
    skill = SkillService.create_skill(db, body.model_dump())
    return success_response(
        data={
            "id": skill.id,
            "name": skill.name,
            "display_name": skill.display_name,
            "skill_type": skill.skill_type
        },
        trace_id=request.state.trace_id
    )

@router.delete("/{skill_id}", summary="根据技能ID删除对应技能配置")
def delete_skill(skill_id: int, request: Request, db: Session = Depends(get_db)):
    """    
    输入参数:
    - skill_id: 技能ID
    """
    SkillService.delete_skill(db, skill_id)
    return success_response(
        data={"message": f"Skill {skill_id} deleted successfully"}, 
        trace_id=request.state.trace_id
    )

