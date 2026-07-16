from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ingest_api_key: str = "dev-ingest-key"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    host: str = "0.0.0.0"
    port: int = 8090


@lru_cache
def get_settings() -> Settings:
    return Settings()
