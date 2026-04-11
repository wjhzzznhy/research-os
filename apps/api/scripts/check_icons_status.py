"""
检查 icons 表状态
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg
from psycopg.rows import dict_row
from app.core.config import settings


def main():
    conn_str = settings.RAG_DATABASE_URL
    if conn_str.startswith("postgresql+psycopg://"):
        conn_str = conn_str.replace("postgresql+psycopg://", "postgresql://")

    print("检查 icons 表状态...\n")

    with psycopg.connect(conn_str) as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'icons'
            """)
            result = cur.fetchone()
            
            if result:
                print("✅ icons 表存在")
                
                cur.execute("SELECT COUNT(*) as count FROM icons")
                count = cur.fetchone()['count']
                print(f"   记录数: {count}")
                
                cur.execute("""
                    SELECT embedding_status, COUNT(*) as count 
                    FROM icons 
                    GROUP BY embedding_status
                """)
                status_counts = cur.fetchall()
                print("\n   向量化状态:")
                for row in status_counts:
                    print(f"     {row['embedding_status']}: {row['count']}")
                
                cur.execute("""
                    SELECT indexname, indexdef 
                    FROM pg_indexes 
                    WHERE tablename = 'icons'
                """)
                indexes = cur.fetchall()
                print("\n   索引:")
                for row in indexes:
                    print(f"     {row['indexname']}")
            else:
                print("❌ icons 表不存在")
                print("   提示: 上传第一个图标时会自动创建表")


if __name__ == "__main__":
    main()
