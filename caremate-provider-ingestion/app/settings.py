from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

IngestEnv = Literal["dev", "prod"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ingest_api_key: str = "dev-ingest-key"

    # Legacy / fallback (used when env-specific vars are empty)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Env-specific Supabase targets (preferred)
    supabase_url_dev: str = ""
    supabase_service_role_key_dev: str = ""
    supabase_url_prod: str = ""
    supabase_service_role_key_prod: str = ""

    # Shared Storage for canonical sample workbooks (same seed for every env)
    storage_supabase_url: str = ""
    storage_supabase_service_role_key: str = ""
    storage_bucket: str = "provider-ingest"
    storage_samples_prefix: str = "samples"

    # Local working copy of canonical samples (xlsx gitignored; README stays in repo)
    samples_dir: str = "samples"

    # After a successful chain-from-samples run, promote cleaned → samples + Storage
    samples_publish_after_chain: bool = False

    # Root for run artifacts: runs/{env}/{timestamp}/
    runs_dir: str = "runs"

    host: str = "0.0.0.0"
    port: int = 8090

    def supabase_for(self, env: IngestEnv) -> tuple[str, str]:
        if env == "prod":
            url = (self.supabase_url_prod or self.supabase_url).strip()
            key = (self.supabase_service_role_key_prod or self.supabase_service_role_key).strip()
        else:
            url = (self.supabase_url_dev or self.supabase_url).strip()
            key = (self.supabase_service_role_key_dev or self.supabase_service_role_key).strip()
        return url, key

    def configured_for(self, env: IngestEnv) -> bool:
        url, key = self.supabase_for(env)
        return bool(url and key)


class EnvSettings(BaseModel):
    """Settings slice bound to a single ingest environment."""

    env: IngestEnv
    ingest_api_key: str
    supabase_url: str
    supabase_service_role_key: str
    runs_dir: str
    host: str
    port: int

    def enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


def bind_env(settings: Settings, env: IngestEnv) -> EnvSettings:
    url, key = settings.supabase_for(env)
    return EnvSettings(
        env=env,
        ingest_api_key=settings.ingest_api_key,
        supabase_url=url,
        supabase_service_role_key=key,
        runs_dir=settings.runs_dir,
        host=settings.host,
        port=settings.port,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
