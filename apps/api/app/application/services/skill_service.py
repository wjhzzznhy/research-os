# app/application/services/skill_service.py
from sqlalchemy.orm import Session
from app.common.exceptions import BizException
from app.domain.models.skill import Skill
from app.repositories.skill_repository import SkillRepository
from app.skills.registry import skill_registry

class SkillService:
    @staticmethod
    def list_skills(db: Session):
        return SkillRepository.list_all(db)

    @staticmethod
    def get_skill_by_id(db: Session, skill_id: int):
        skill = SkillRepository.get_by_id(db, skill_id)
        if not skill:
            raise BizException(40404, "技能不存在", 404)
        return skill

    @staticmethod
    def get_skill_by_name(db: Session, name: str):
        skill = SkillRepository.get_by_name(db, name)
        if not skill:
            raise BizException(40404, "技能不存在", 404)
        return skill

    @staticmethod
    def create_skill(db: Session, create_data: dict):
        # 檢查 name 是否重复，防止数据库错误
        existing = SkillRepository.get_by_name(db, create_data.get("name"))
        if existing:
            raise BizException(40001, f"技能标识名称 '{create_data['name']}' 已存在", 400)
        return SkillRepository.create(db, create_data)

    @staticmethod
    def update_skill(db: Session, skill_id: int, update_data: dict):
        # 1. 复用已经写好的获取逻辑（自带 404 报错校验）
        skill = SkillService.get_skill_by_id(db, skill_id)
        # 2. 把更新的具体动作丢给底层 Repository 去做
        return SkillRepository.update(db, skill, update_data)

    @staticmethod
    def delete_skill(db: Session, skill_id: int):
        skill = db.query(Skill).filter(Skill.id == skill_id).first()
        if not skill:
            raise BizException(40404, "技能不存在",404)
        
        # ⚠️ 安全拦截：防止把系统核心基础技能删了导致引擎瘫痪
        protected_skills = ["echo_text", "health_check", "query_task"]
        if skill.name in protected_skills:
            raise BizException(40305, "系统基础测试技能不允许删除", 403)
            
        db.delete(skill)
        db.commit()
        return True
    
    @staticmethod
    def invoke_skill(db: Session, name: str, payload: dict | None = None) -> dict:
        skill = SkillService.get_skill_by_name(db, name)
        if not skill.is_enabled:
            raise BizException(40301, "此技能已被禁用", 403)
        executor = skill_registry.get(name)
        if executor is None:
            raise BizException(50001, "找不到对应的技能执行器 (Executor未注册)", 500)
        return executor.execute(payload=payload or {}, db=db)
