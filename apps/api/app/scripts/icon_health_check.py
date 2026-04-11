import argparse
import asyncio
import logging
from datetime import datetime, timedelta

import psycopg
from psycopg.rows import dict_row

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def get_connection_string() -> str:
    conn_str = settings.RAG_DATABASE_URL
    if conn_str.startswith("postgresql+psycopg://"):
        conn_str = conn_str.replace("postgresql+psycopg://", "postgresql://")
    return conn_str


async def check_health():
    conn_str = get_connection_string()
    
    with psycopg.connect(conn_str) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE embedding_status = 'pending') as pending,
                    COUNT(*) FILTER (WHERE embedding_status = 'processing') as processing,
                    COUNT(*) FILTER (WHERE embedding_status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE embedding_status = 'failed') as failed,
                    COUNT(*) FILTER (WHERE status = 'active') as active,
                    COUNT(*) FILTER (WHERE embedding IS NULL AND status = 'active') as missing_embedding
                FROM icons
            """)
            stats = dict(cur.fetchone())
            
            cur.execute("""
                SELECT COUNT(*) as permanent_failed
                FROM icons
                WHERE embedding_status = 'failed' AND retry_count >= 3
            """)
            permanent_failed = cur.fetchone()["permanent_failed"]
            
            cur.execute("""
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM icons
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY date
                ORDER BY date DESC
            """)
            daily_uploads = [dict(row) for row in cur.fetchall()]
    
    logger.info("=" * 60)
    logger.info("图标系统健康检查报告")
    logger.info("=" * 60)
    logger.info(f"总图标数: {stats['total']}")
    logger.info(f"活跃图标: {stats['active']}")
    logger.info(f"待向量化: {stats['pending']}")
    logger.info(f"向量化中: {stats['processing']}")
    logger.info(f"已完成: {stats['completed']}")
    logger.info(f"失败: {stats['failed']}")
    logger.info(f"悬空向量: {stats['missing_embedding']}")
    logger.info(f"永久失败: {permanent_failed}")
    logger.info("-" * 60)
    logger.info("近7日上传量:")
    for row in daily_uploads:
        logger.info(f"  {row['date']}: {row['count']}")
    logger.info("=" * 60)
    
    return stats


async def requeue_failed():
    conn_str = get_connection_string()
    
    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE icons SET embedding_status = 'pending'
                WHERE embedding_status = 'failed' 
                  AND retry_count < 3
                  AND created_at > NOW() - INTERVAL '7 days'
            """)
            requeued = cur.rowcount
            conn.commit()
    
    logger.info(f"已重新投递 {requeued} 个失败任务")
    return requeued


async def cleanup_old_deleted(days: int = 30):
    conn_str = get_connection_string()
    
    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM icons
                WHERE status = 'deleted'
                  AND updated_at < NOW() - INTERVAL '%s days'
            """, (days,))
            deleted = cur.rowcount
            conn.commit()
    
    logger.info(f"已清理 {deleted} 个 {days} 天前软删除的图标")
    return deleted


async def reindex_embeddings():
    conn_str = get_connection_string()
    
    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            logger.info("创建新向量索引...")
            cur.execute("""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_icon_embedding_hnsw_new 
                ON icons USING hnsw (embedding vector_cosine_ops)
                WITH (m = 32, ef_construction = 128)
            """)
            conn.commit()
            
            logger.info("删除旧索引...")
            cur.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_icon_embedding_hnsw")
            conn.commit()
            
            logger.info("重命名新索引...")
            cur.execute("ALTER INDEX IF EXISTS idx_icon_embedding_hnsw_new RENAME TO idx_icon_embedding_hnsw")
            conn.commit()
            
            logger.info("分析表...")
            cur.execute("ANALYZE icons")
            conn.commit()
    
    logger.info("向量索引重建完成")


async def main():
    parser = argparse.ArgumentParser(description="图标系统健康检查和运维脚本")
    parser.add_argument("--requeue-failed", action="store_true", help="重新投递失败任务")
    parser.add_argument("--cleanup-days", type=int, default=0, help="清理指定天数前软删除的图标")
    parser.add_argument("--reindex", action="store_true", help="重建向量索引")
    
    args = parser.parse_args()
    
    await check_health()
    
    if args.requeue_failed:
        await requeue_failed()
    
    if args.cleanup_days > 0:
        await cleanup_old_deleted(args.cleanup_days)
    
    if args.reindex:
        await reindex_embeddings()


if __name__ == "__main__":
    asyncio.run(main())
