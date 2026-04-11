import os
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "ResearchOS"

    APP_ENV: str = "dev"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    SECRET_KEY: str = "replace_me"

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "research"
    POSTGRES_PASSWORD: str = "research_password"
    POSTGRES_DB: str = "research_os"
    DATABASE_URL: Optional[str] = None
    RAG_DATABASE_URL: Optional[str] = None

    @model_validator(mode="after")
    def assemble_db_urls(self):
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
            )
        if not self.RAG_DATABASE_URL:
            self.RAG_DATABASE_URL = (
                f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
            )
        return self

    @property
    def sync_database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
        )

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    @property
    def redis_url(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    GOOGLE_API_KEY: str = ""

    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"

    LOCAL_EMBEDDING_MODEL_PATH: str = "/app/models/embedding"
    USE_LOCAL_EMBEDDINGS: bool = True

    RUSTFS_ENDPOINT: str = "http://rustfs:9000"
    RUSTFS_PUBLIC_ENDPOINT: str = ""
    RUSTFS_ACCESS_KEY: str = "rustfsadmin"
    RUSTFS_SECRET_KEY: str = "rustfsadmin"
    RUSTFS_BUCKET_PAPERS: str = "papers"
    RUSTFS_BUCKET_ASSETS: str = "assets"
    RUSTFS_SECURE: bool = False

    TORCH_DEVICE: str = "auto"
    WARMUP_ON_STARTUP: bool = True

    STORAGE_BASE: str = "/app/storage"
    MEDIA_BASE: str = ""

    ALGORITHM_MODE: str = "mock"
    ALGORITHM_COMMAND: str = ""

    MINERU_SERVICE_URL: str = "http://mineru:8001"
    MINERU_TIMEOUT: int = 600

    SMART_DRAW_ACCESS_PASSWORD: str = ""
    SMART_DRAW_SERVER_LLM_TYPE: str = ""
    SMART_DRAW_SERVER_LLM_BASE_URL: str = ""
    SMART_DRAW_SERVER_LLM_API_KEY: str = ""
    SMART_DRAW_SERVER_LLM_MODEL: str = ""


settings = Settings()
