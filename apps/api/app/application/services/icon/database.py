import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg
from psycopg.rows import dict_row

from app.core.config import settings
from app.application.services.icon.models import Icon, EmbeddingStatus, IconStatus

logger = logging.getLogger(__name__)


class IconDatabase:
    EMBEDDING_DIM = 1024

    def __init__(self):
        self.connection_string = settings.RAG_DATABASE_URL
        self._schema_ready = False

    def _get_connection_string(self) -> str:
        conn_str = self.connection_string
        if conn_str.startswith("postgresql+psycopg://"):
            conn_str = conn_str.replace("postgresql+psycopg://", "postgresql://")
        return conn_str

    async def ensure_schema(self) -> None:
        if self._schema_ready:
            return

        conn_str = self._get_connection_string()

        def _create_tables():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor() as cur:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                    cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS icons (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            name VARCHAR(255) NOT NULL,
                            style VARCHAR(50),
                            source_file_path VARCHAR(1024),
                            render_file_path VARCHAR(1024) NOT NULL,
                            tags_manual TEXT[] DEFAULT '{}',
                            embedding VECTOR(1024),
                            embedding_model VARCHAR(50) DEFAULT 'qwen3-vl-embedding-2b',
                            embedding_at TIMESTAMP WITH TIME ZONE,
                            embedding_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                            embedding_error TEXT,
                            retry_count INT DEFAULT 0,
                            status VARCHAR(32) NOT NULL DEFAULT 'active',
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                        );
                    """)

                    cur.execute("""
                        CREATE OR REPLACE FUNCTION set_updated_at()
                        RETURNS TRIGGER AS $$
                        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
                        $$ LANGUAGE plpgsql;
                    """)

                    cur.execute("""
                        DROP TRIGGER IF EXISTS trg_icons_updated_at ON icons;
                        CREATE TRIGGER trg_icons_updated_at
                        BEFORE UPDATE ON icons
                        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
                    """)

                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_icon_embedding_hnsw
                        ON icons USING hnsw (embedding vector_cosine_ops)
                        WITH (m = 32, ef_construction = 128);
                    """)

                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_icons_style_status_created
                        ON icons(style, status, created_at DESC)
                        WHERE status = 'active';
                    """)

                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_icons_embedding_pending
                        ON icons(embedding_status)
                        WHERE embedding_status = 'pending';
                    """)

                    cur.execute("""
                        CREATE INDEX IF NOT EXISTS idx_icons_tags_manual 
                        ON icons USING GIN (tags_manual);
                    """)

                    conn.commit()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _create_tables)
        self._schema_ready = True
        logger.info("Icon database schema ensured")

    async def insert_icon(
        self,
        name: str,
        render_file_path: str,
        style: Optional[str] = None,
        source_file_path: Optional[str] = None,
        tags_manual: Optional[List[str]] = None,
    ) -> str:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _insert():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute(
                        """
                        INSERT INTO icons (name, style, source_file_path, render_file_path, tags_manual)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (name, style, source_file_path, render_file_path, tags_manual or []),
                    )
                    conn.commit()
                    return str(cur.fetchone()["id"])

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _insert)

    async def get_pending_icons(self, limit: int = 20) -> List[Icon]:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _query():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute(
                        """
                        SELECT id, name, render_file_path, style, source_file_path, 
                               tags_manual, embedding_status, retry_count, status,
                               created_at, updated_at
                        FROM icons
                        WHERE embedding_status = 'pending'
                        ORDER BY created_at ASC
                        LIMIT %s
                        FOR UPDATE SKIP LOCKED
                        """,
                        (limit,),
                    )
                    return [Icon.from_db_row(row) for row in cur.fetchall()]

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _query)

    async def update_embedding(
        self,
        icon_id: str,
        embedding: List[float],
        status: EmbeddingStatus = EmbeddingStatus.COMPLETED,
        error: Optional[str] = None,
    ) -> bool:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        def _update():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE icons SET 
                            embedding = %s::vector,
                            embedding_status = %s,
                            embedding_at = %s,
                            embedding_error = %s,
                            retry_count = 0
                        WHERE id = %s
                        """,
                        (embedding_str, status.value, datetime.now(), error, icon_id),
                    )
                    conn.commit()
                    return cur.rowcount > 0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _update)

    async def mark_embedding_failed(
        self,
        icon_id: str,
        error: str,
        retry_count: int,
        max_retries: int = 3,
    ) -> bool:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        new_status = EmbeddingStatus.FAILED if retry_count >= max_retries else EmbeddingStatus.PENDING

        def _update():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE icons SET 
                            embedding_status = %s,
                            embedding_error = %s,
                            retry_count = %s
                        WHERE id = %s
                        """,
                        (new_status.value, error[:500] if error else None, retry_count, icon_id),
                    )
                    conn.commit()
                    return cur.rowcount > 0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _update)

    async def search_by_vector(
        self,
        query_vector: List[float],
        top_k: int = 20,
    ) -> List[Dict[str, Any]]:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"

        def _search():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute(
                        """
                        SELECT id, name, style, source_file_path, render_file_path, tags_manual,
                               1 - (embedding <=> %s::vector) AS similarity
                        FROM icons
                        WHERE embedding IS NOT NULL AND status = 'active'
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (vector_str, vector_str, top_k),
                    )
                    return [dict(row) for row in cur.fetchall()]

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _search)

    async def get_icon_by_id(self, icon_id: str) -> Optional[Icon]:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _get():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute(
                        """
                        SELECT * FROM icons WHERE id = %s
                        """,
                        (icon_id,),
                    )
                    row = cur.fetchone()
                    return Icon.from_db_row(row) if row else None

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _get)

    async def soft_delete_icon(self, icon_id: str) -> bool:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _delete():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE icons SET status = 'deleted' WHERE id = %s
                        """,
                        (icon_id,),
                    )
                    conn.commit()
                    return cur.rowcount > 0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _delete)

    async def hard_delete_icon(self, icon_id: str) -> bool:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _delete():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        DELETE FROM icons WHERE id = %s
                        """,
                        (icon_id,),
                    )
                    conn.commit()
                    return cur.rowcount > 0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _delete)

    async def rename_icon(self, icon_id: str, new_name: str) -> bool:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _rename():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE icons SET name = %s WHERE id = %s AND status = 'active'
                        """,
                        (new_name, icon_id),
                    )
                    conn.commit()
                    return cur.rowcount > 0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _rename)

    async def update_tags(self, icon_id: str, tags: List[str]) -> bool:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _update():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE icons SET tags_manual = %s WHERE id = %s
                        """,
                        (tags, icon_id),
                    )
                    conn.commit()
                    return cur.rowcount > 0

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _update)

    async def count_icons(self) -> Dict[str, int]:
        await self.ensure_schema()
        conn_str = self._get_connection_string()

        def _count():
            with psycopg.connect(conn_str) as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    cur.execute("""
                        SELECT 
                            COUNT(*) as total,
                            COUNT(*) FILTER (WHERE embedding_status = 'pending') as pending,
                            COUNT(*) FILTER (WHERE embedding_status = 'processing') as processing,
                            COUNT(*) FILTER (WHERE embedding_status = 'completed') as completed,
                            COUNT(*) FILTER (WHERE embedding_status = 'failed') as failed,
                            COUNT(*) FILTER (WHERE status = 'active') as active
                        FROM icons
                    """)
                    return dict(cur.fetchone())

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _count)


icon_database = IconDatabase()
