"""Thin async wrapper around the OpenAI Chat Completions API."""

from __future__ import annotations

import logging

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger("llm_client")

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        kwargs: dict = {"api_key": settings.openai_api_key}
        if settings.openai_base_url:
            kwargs["base_url"] = settings.openai_base_url
        _client = AsyncOpenAI(**kwargs)
    return _client


class LLMResponse:
    def __init__(self, text: str, prompt_tokens: int, completion_tokens: int) -> None:
        self.text = text
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


async def complete(messages: list[dict[str, str]]) -> LLMResponse:
    """Send messages to the LLM and return the assistant reply."""
    client = _get_client()
    logger.debug("Calling LLM model=%s messages=%d", settings.openai_model, len(messages))
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,  # type: ignore[arg-type]
        temperature=0.7,
        max_tokens=512,
    )
    choice = response.choices[0]
    usage = response.usage
    return LLMResponse(
        text=choice.message.content or "",
        prompt_tokens=usage.prompt_tokens if usage else 0,
        completion_tokens=usage.completion_tokens if usage else 0,
    )
