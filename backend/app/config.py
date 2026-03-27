"""Application settings loaded from environment variables / .env file."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM
    openai_api_key: str = "test-key"
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = ""

    # CORS
    allowed_origins: str = "https://yourexpress.github.io"

    # Input validation
    max_input_length: int = 1000

    # Concurrency
    max_concurrent_requests: int = 10

    # Rate limiting (token bucket)
    rate_limit_burst: int = 10
    rate_limit_refill_interval: int = 600  # seconds per token (600 s = 10 min)

    # Application metadata
    app_version: str = "1.0.0"

    # Proxy
    trust_proxy_headers: bool = False

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
