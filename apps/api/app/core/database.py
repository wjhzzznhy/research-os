from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

sync_engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=sync_engine,
    autoflush=False,
    autocommit=False,
)
