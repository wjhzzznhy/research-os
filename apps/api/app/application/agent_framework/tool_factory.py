# app/application/agent_framework/tool_factory.py
from typing import List
from sqlalchemy.orm import Session
from langchain_core.tools import StructuredTool
from app.application.services.skill_service import SkillService
from app.core.logger import get_logger

logger = get_logger("tool_factory")

class ToolFactory:
    """
    动态工具工厂类，桥接数据库与 LangChain 工具。
    """
    
    @staticmethod
    def create_tools_from_names(db: Session, skill_names: List[str]) -> List[StructuredTool]:
        """根据画板节点配置的技能名称，动态生成 LangChain 工具列表"""
        tools = []
        if not skill_names:
            return tools

        for name in skill_names:
            try:
                # 1. 从数据库里查这个技能是否存在
                skill_record = SkillService.get_skill_by_name(db, name)
                if not skill_record or not skill_record.is_enabled:
                    logger.warning(f"⚠️ 技能/工具 {name} 在数据库中未找到或已禁用，已跳过装配。")
                    continue

                # 2. 闭包构造执行逻辑，把底层的调用转接给 SkillService
                def _tool_executor(document_id: str = None, document_ids: list = None, keyword: str = None, query: str = None, bound_name=name, **kwargs):
                    payload = kwargs.copy()
                    if document_id: payload["document_id"] = document_id
                    if document_ids: payload["document_ids"] = document_ids
                    if keyword: payload["keyword"] = keyword
                    if query: payload["query"] = query

                    logger.info(f"🔧 正在执行动态工具: {bound_name}, 参数: {payload}")
                    return SkillService.invoke_skill(db, bound_name, payload=payload)

                # 3. 动态包装成 LangChain 标准 Tool
                # 这样大模型就能读到数据库里配置的 description，知道何时该用它
                dynamic_tool = StructuredTool.from_function(
                    func=_tool_executor,
                    name=skill_record.name,
                    description=skill_record.description or f"执行 {skill_record.display_name} 任务",
                    # TODO: 未来若数据库 input_schema 完善，可进一步解析 skill.input_schema，动态生成 Pydantic BaseModel 传入 args_schema，来严格约束大模型的入参
                )
                tools.append(dynamic_tool)
            except Exception as e:
                logger.error(f"❌ 动态组装工具 {name} 失败: {str(e)}")
                
        return tools
