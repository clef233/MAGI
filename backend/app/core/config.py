from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # Database
    database_url: str = "sqlite+aiosqlite:///./magi.db"

    # Security
    secret_key: str = "magi-secret-key-change-in-production"

    # CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Default LLM settings
    default_max_tokens: int = 4096
    default_temperature: float = 0.7

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()