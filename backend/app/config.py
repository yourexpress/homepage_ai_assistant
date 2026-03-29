"""Application settings loaded from environment variables / .env file."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM
    llm_provider: str = "auto"
    openai_api_key: str = "test-key"
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = ""
    anthropic_api_key: str = ""
    anthropic_model: str = ""
    llm_temperature: float = 0.7
    llm_max_tokens: int = 512

    # CORS
    allowed_origins: str = (
        "http://localhost:8080,"
        "http://localhost:3000,"
        "https://yourexpress.github.io,"
        "https://runyuma.uk,"
        "https://www.runyuma.uk"
    )

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

    # Session-aware chat
    max_history_messages: int = 12

    # Persistent file-backed app data
    data_dir: str = "data"
    site_content_file: str = "data/site_content.json"
    comments_file: str = "data/comments.json"

    # Manager / admin
    admin_api_key: str = ""

    # Happy personality
    happy_mode_enabled: bool = False
    happy_mode_access_code: str = "replace-with-happy-code"
    happy_mode_question: str = "Replace this question in your private server config."
    happy_mode_expected_answer: str = "replace-with-happy-answer"
    happy_mode_secret: str = "replace-with-random-secret"
    happy_mode_visitor_name_en: str = ""
    happy_mode_visitor_name_zh: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def data_dir_path(self) -> Path:
        return Path(self.data_dir)

    @property
    def site_content_path(self) -> Path:
        return Path(self.site_content_file)

    @property
    def comments_path(self) -> Path:
        return Path(self.comments_file)


settings = Settings()
