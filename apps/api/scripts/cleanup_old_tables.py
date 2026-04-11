"""
清理旧的向量检索相关表

运行方式：
    docker exec xm-api-1 python scripts/cleanup_old_tables.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg
from psycopg.rows import dict_row
from app.core.config import settings


def cleanup_old_tables():
    conn_str = settings.RAG_DATABASE_URL
    if conn_str.startswith("postgresql+psycopg://"):
        conn_str = conn_str.replace("postgresql+psycopg://", "postgresql://")

    print("=" * 60)
    print("清理旧的向量检索表")
    print("=" * 60)

    tables_to_drop = [
        "vector_embeddings",
        "vector_collections", 
        "material_assets",
    ]

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            for table in tables_to_drop:
                cur.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                print(f"  ✅ 删除表: {table}")
            
            conn.commit()

    print("\n" + "=" * 60)
    print("清理完成!")
    print("=" * 60)


if __name__ == "__main__":
    cleanup_old_tables()
