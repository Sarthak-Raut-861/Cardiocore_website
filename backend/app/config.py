"""
CardioCoreEdge Backend Configuration
Loaded via Pydantic Settings from environment variables or .env file.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CardioCoreEdge API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Security & Sessions
    SECRET_KEY: str = "insecure-dev-secret-key-change-in-production-min-32-chars"
    SESSION_COOKIE_NAME: str = "cc_session"
    SESSION_IDLE_TIMEOUT_SECONDS: int = 900  # 15 minutes
    SESSION_MAX_LIFETIME_SECONDS: int = 43200  # 12 hours
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./cardiocore_dev.db"

    # Redis (Ephemeral test default)
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
