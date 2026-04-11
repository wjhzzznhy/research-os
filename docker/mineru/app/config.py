from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MINERU_EXECUTABLE: str = "python"
    MINERU_COMMAND: str = ""
    MINERU_PROJECT_DIR: str = "/app"
    MINERU_TIMEOUT: int = 600
    STORAGE_BASE: str = "/app/storage"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8001


settings = Settings()
