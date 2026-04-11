@echo off
REM 检查向量数据库状态脚本 (Windows PowerShell)
REM 在项目根目录执行

echo ========================================
echo 检查向量数据库状态
echo ========================================

echo.
echo 1. 检查向量维度...
docker compose exec -T api python -c "
import os
import psycopg

conn_str = os.environ.get('RAG_DATABASE_URL', os.environ.get('DATABASE_URL', ''))
if conn_str.startswith('postgresql+asyncpg://'):
    conn_str = conn_str.replace('postgresql+asyncpg://', 'postgresql://')
if conn_str.startswith('postgresql+psycopg://'):
    conn_str = conn_str.replace('postgresql+psycopg://', 'postgresql://')

with psycopg.connect(conn_str) as conn:
    with conn.cursor() as cur:
        cur.execute('''
            SELECT a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod)
            FROM pg_attribute a
            JOIN pg_class c ON a.attrelid = c.oid
            WHERE c.relname = 'vector_embeddings' AND a.attname = 'embedding'
        ''')
        row = cur.fetchone()
        if row:
            print(f'vector_embeddings.embedding: {row[1]}')
        
        cur.execute('SELECT COUNT(*) FROM vector_embeddings')
        count = cur.fetchone()[0]
        print(f'Total vectors: {count}')
        
        cur.execute('''
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'vector_embeddings' AND indexname LIKE '%%embedding%%'
        ''')
        indexes = [r[0] for r in cur.fetchall()]
        print(f'Indexes: {indexes}')
"

echo.
echo 2. 检查 icons 表...
docker compose exec -T api python -c "
import os
import psycopg

conn_str = os.environ.get('RAG_DATABASE_URL', os.environ.get('DATABASE_URL', ''))
if conn_str.startswith('postgresql+asyncpg://'):
    conn_str = conn_str.replace('postgresql+asyncpg://', 'postgresql://')
if conn_str.startswith('postgresql+psycopg://'):
    conn_str = conn_str.replace('postgresql+psycopg://', 'postgresql://')

with psycopg.connect(conn_str) as conn:
    with conn.cursor() as cur:
        cur.execute('''
            SELECT a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod)
            FROM pg_attribute a
            JOIN pg_class c ON a.attrelid = c.oid
            WHERE c.relname = 'icons' AND a.attname = 'embedding'
        ''')
        row = cur.fetchone()
        if row:
            print(f'icons.embedding: {row[1]}')
        
        cur.execute('SELECT COUNT(*) FROM icons WHERE embedding IS NOT NULL')
        count = cur.fetchone()[0]
        print(f'Icons with embedding: {count}')
        
        cur.execute('''
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'icons' AND indexname LIKE '%%embedding%%'
        ''')
        indexes = [r[0] for r in cur.fetchall()]
        print(f'Indexes: {indexes}')
"

echo.
echo ========================================
echo 如果向量维度是 2048，需要重建数据库
echo ========================================
