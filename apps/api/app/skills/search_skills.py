# app/skills/search_skills.py
import logging, uuid
from sqlalchemy.orm import Session
from .search_papers import search_papers
from app.skills.base import BaseSkillExecutor
from app.repositories.document_chunk_repository import DocumentChunkRepository
from app.domain.models.document_chunk import DocumentChunk

logger = logging.getLogger("search_skills")

class AcademicSearchSkill(BaseSkillExecutor):
    """包装外部学术检索功能"""
    def execute(self, payload: dict, db: Session = None) -> dict:
        keyword = payload.get("keyword", "")
        logger.info(f"🔍 正在执行学术检索，关键词: {keyword}")
        try:
            results = search_papers(keyword=keyword, top_k=3)
            return {"status": "success", "results": results}
        except Exception as e:
            logger.error(f"学术检索失败: {e}")
            # 返回友好的错误给大模型，防崩溃
            return {"status": "error", "message": f"检索失败: {str(e)}"}

class LocalKnowledgeSkill(BaseSkillExecutor):
    """资料库文献检索技能"""
    def execute(self, payload: dict, db: Session = None) -> dict:
        doc_id = payload.get("document_id")
        doc_ids = payload.get("document_ids") or []

        if isinstance(doc_id, str):
            doc_ids.append(doc_id)
            
        if not doc_ids:
            return {
                "status": "error", 
                "message": (
                    "❌ 检索失败：必须提供 document_ids 参数！\n"
                    "请仔细回看你的输入上下文(payload)或系统提示词，找到系统提供给你的合法 document_ids 数组（包含真实的 UUID），"
                    "并将其作为参数传入。绝对不要凭空捏造文件名当做 ID！"
                )
            }

        valid_uuids = []
        for did in doc_ids:
            try:
                val = uuid.UUID(did, version=4)
                valid_uuids.append(str(val))
            except ValueError:
                logger.warning(f"⚠️ 拦截到无效的 ID: {did}")
                
        if not valid_uuids:
            return {
                "status": "error", 
                "message": (
                    f"❌ 检索失败：你传入的 ID ({doc_ids}) 格式非法！\n"
                    "系统只接受标准的 UUID 格式（类似 fb5d96c4-xxx）。请停止猜测！"
                    "务必严格查阅你的初始 payload 上下文，复制里面为你准备好的真实 document_ids 再次调用本工具！"
                )
            }

        try:
            chunks = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.document_id.in_(valid_uuids))
                .order_by(DocumentChunk.document_id, DocumentChunk.chunk_index)
                .limit(100) # 稍微放宽一点限制，以防多文档查不全
                .all()
            )
            
            if not chunks:
                return {"status": "success", "results": "这些文档目前没有解析出任何文本内容。"}

            text_results = []
            for chunk in chunks:
                doc_prefix = f"[文档 {str(chunk.document_id)[:8]}] " if len(valid_uuids) > 1 else ""
                chapter_info = f"[{chunk.chapter}] " if chunk.chapter else ""
                title_info = f"{chunk.title}" if chunk.title else f"片段 {chunk.chunk_index}"
                text_results.append(f"--- {doc_prefix}{chapter_info}{title_info} ---\n{chunk.content}")
                
            return {"status": "success", "results": "\n\n".join(text_results)}
            
        except Exception as e:
            if db:
                db.rollback() 
            logger.error(f"知识库检索致命失败: {e}")
            return {"status": "error", "message": f"数据库读取失败，请重试。"}
