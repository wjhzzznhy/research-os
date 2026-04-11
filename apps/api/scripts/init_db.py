# scripts/init_db.py
import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.core.database import sync_engine as engine, SessionLocal
from app.core.logger import get_logger

from app.domain.models import *
from app.application.workflows import *

from scripts.seed_skills import seed as seed_skills
from scripts.seed_memory import seed as seed_memory

logger = get_logger("init_db")

def init_tables():
    logger.info("🛠️ 开始重建数据库表结构...")
    Base.metadata.drop_all(bind=engine)   # 注意：drop_all 会清空数据。在生产环境请注释掉这一行
    Base.metadata.create_all(bind=engine)
    logger.info("✅ 数据库表结构准备就绪！")

def seed_workflows(db):
    logger.info("📦 开始刷入系统预置工作流图纸Workflows...")

    workflow_classes = [
        InnovationWorkflow,
        # ChatWorkflow,
        # CodingWorkflow,
        # DrawingWorkflow,
        # ReadingWorkflow,
        # ReviewWorkflow,
        # SearchWorkflow
    ]
    
    for wf_class in workflow_classes:
        try:
            config = wf_class.get_default_config()
            wf_id = config["id"]
            
            existing_wf = db.query(Workflow).filter(Workflow.id == wf_id).first()
            if not existing_wf:
                new_wf = Workflow(
                    id=wf_id,
                    name=config["name"],
                    category=config.get("category", "system"),
                    is_system=config.get("is_system", True),
                    graph_config=config["graph_config"]
                )
                db.add(new_wf)
                logger.info(f" ✨ 新增图纸: {wf_id}")
            else:
                # 用最新代码覆盖数据库里的结构，方便调试更新
                existing_wf.name = config["name"]
                existing_wf.graph_config = config["graph_config"]
                logger.info(f"   🔄 更新图纸: {wf_id}")
                
        except Exception as e:
            logger.error(f"   ❌ 解析图纸 {wf_class.__name__} 失败: {str(e)}")
            
    db.commit()

def main():
    logger.info("🚀 启动数据库初始化与数据灌注程序...")
    init_tables()
    
    db = SessionLocal()
    try:
        # 按顺序刷入：图纸 -> 技能 -> 初始记忆
        seed_workflows(db)
        seed_skills()
        seed_memory()
        logger.info("🎉 恭喜！系统初始化全部完成了！")
    except Exception as e:
        logger.error(f"❌ 初始化过程发生严重错误: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

