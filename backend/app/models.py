"""Pydantic request/response models."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from app.config import settings


class ChatRequest(BaseModel):
    message: str = Field(..., description="The visitor's message to the assistant.")

    @field_validator("message")
    @classmethod
    def check_length(cls, value: str) -> str:
        if len(value) > settings.max_input_length:
            raise ValueError(
                f"Message exceeds maximum length of {settings.max_input_length} characters."
            )
        return value


class ChatResponse(BaseModel):
    reply: str
    blocked: bool = False


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
