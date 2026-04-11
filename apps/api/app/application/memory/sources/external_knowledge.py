# app/application/memory/sources/external_knowledge.py
from sqlalchemy.orm import Session
from app.application.services.skill_service import SkillService
from app.core.logger import get_logger

logger = get_logger("external_knowledge")

class ExternalKnowledge:
    def __init__(self, db: Session):
        self.db = db
    
    def fetch(self, query: str, document_ids: list = None, top_k: int = 3):
        logger.info(f"📚 从外部知识源获取信息: {query}")
        try:
            payload = {
                "query": query, 
                "top_k": top_k
            }
            if document_ids:
                payload["document_ids"] = document_ids
            # 直接复用我们注册好的底层技能！
            result = SkillService.invoke_skill(self.db, "local_knowledge", payload)
            return result.get("results", [])
        except Exception as e:
            logger.error(f"获取外部知识失败: {e}")
            return []
    
    def store(self, data: dict):
        # 占位：未来如果接入 Milvus/Qdrant 向量数据库，这里写文档向量化入库的逻辑
        logger.info("入库外部知识（待接入向量库）")
        pass
