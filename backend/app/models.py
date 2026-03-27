"""Pydantic request/response models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.config import settings


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., description="Historical chat message content.")

    @field_validator("content")
    @classmethod
    def check_content_length(cls, value: str) -> str:
        if len(value) > settings.max_input_length:
            raise ValueError(
                f"History message exceeds maximum length of {settings.max_input_length} characters."
            )
        return value


class ChatRequest(BaseModel):
    message: str = Field(..., description="The visitor's message to the assistant.")
    history: list[ChatHistoryMessage] = Field(
        default_factory=list,
        description="Prior messages from the current chat session.",
    )
    session_id: str | None = Field(
        default=None,
        description="Opaque browser session identifier for current chat session state.",
    )
    happy_token: str | None = Field(
        default=None,
        description="Optional signed token enabling the private happy personality mode.",
    )

    @field_validator("message")
    @classmethod
    def check_length(cls, value: str) -> str:
        if len(value) > settings.max_input_length:
            raise ValueError(
                f"Message exceeds maximum length of {settings.max_input_length} characters."
            )
        return value

    @field_validator("history")
    @classmethod
    def check_history_length(cls, value: list[ChatHistoryMessage]) -> list[ChatHistoryMessage]:
        if len(value) > settings.max_history_messages:
            raise ValueError(
                f"History exceeds maximum of {settings.max_history_messages} messages."
            )
        return value


class ChatResponse(BaseModel):
    reply: str
    blocked: bool = False
    happy_mode_active: bool = False


class MetricsResponse(BaseModel):
    total_requests: int
    blocked_requests: int
    llm_requests: int
    successful_responses: int
    rate_limited_requests: int
    concurrency_rejected_requests: int
    latency_buckets: dict[str, int]
    total_prompt_tokens: int
    total_completion_tokens: int


class HealthResponse(BaseModel):
    """Liveness probe response."""

    status: str = Field(
        ...,
        description="'ok' or 'degraded'.",
        json_schema_extra={"examples": ["ok"]},
    )
    version: str = Field(..., description="Application version string.")


class ReadinessResponse(BaseModel):
    """Readiness probe with dependency checks."""

    status: str = Field(
        ...,
        description="'ok', 'degraded', or 'unavailable'.",
    )
    version: str = Field(..., description="Application version string.")
    checks: dict[str, str] = Field(
        ...,
        description="Per-dependency status map.",
        json_schema_extra={"examples": [{"knowledge_base": "ok", "llm_configured": "ok"}]},
    )


class SiteContentResponse(BaseModel):
    content: dict
    capabilities: dict[str, bool]


class SiteContentUpdateRequest(BaseModel):
    content: dict


class SiteContentUpdateResponse(BaseModel):
    content: dict
    sync_notes: list[str] = Field(default_factory=list)


class CommentCreateRequest(BaseModel):
    author: str = Field(default="Anonymous", max_length=40)
    website_rating: int = Field(..., ge=0, le=5)
    resume_rating: int = Field(..., ge=0, le=5)
    body: str = Field(..., min_length=1, max_length=1000)

    @field_validator("author")
    @classmethod
    def default_author(cls, value: str) -> str:
        stripped = value.strip()
        return stripped or "Anonymous"

    @field_validator("body")
    @classmethod
    def clean_body(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Comment body must not be empty.")
        return stripped


class CommentVoteRequest(BaseModel):
    direction: Literal["up", "down"]


class CommentResponse(BaseModel):
    id: str
    author: str
    website_rating: int
    resume_rating: int
    body: str
    created_at: str
    upvotes: int
    downvotes: int
    score: int


class CommentListResponse(BaseModel):
    items: list[CommentResponse]
    page: int
    page_size: int
    total_items: int
    total_pages: int
    sort: Literal["latest", "likest"]


class HappyChallengeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=128)
    session_id: str = Field(..., min_length=1, max_length=128)


class HappyChallengeResponse(BaseModel):
    ok: bool
    question: str | None = None
    message: str | None = None


class HappyVerifyRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=128)
    answer: str = Field(..., min_length=1, max_length=256)
    session_id: str = Field(..., min_length=1, max_length=128)


class HappyVerifyResponse(BaseModel):
    ok: bool
    token: str | None = None
    message: str | None = None
