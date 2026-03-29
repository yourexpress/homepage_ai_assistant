"""Async LLM wrapper supporting OpenAI, OpenAI-compatible APIs, and Anthropic."""

from __future__ import annotations

import logging
from typing import Any

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger("llm_client")

_OPENAI_COMPATIBLE_PROVIDERS = {
    "openai_compatible",
    "gemini",
    "groq",
    "deepseek",
    "openrouter",
    "together",
    "mistral",
    "xai",
}
_DEFAULT_OPENAI_BASE_URLS = {
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
}

_openai_client: AsyncOpenAI | None = None
_anthropic_client: Any | None = None


class LLMResponse:
    def __init__(self, text: str, prompt_tokens: int, completion_tokens: int) -> None:
        self.text = text
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


def _normalize_provider() -> str:
    provider = settings.llm_provider.strip().lower()
    if provider and provider != "auto":
        return provider

    model = settings.openai_model.strip().lower()
    if settings.openai_base_url.strip():
        return "openai_compatible"
    if model.startswith("claude"):
        return "anthropic"
    if model.startswith("gemini"):
        return "gemini"
    return "openai"


def _require_setting(name: str, value: str) -> str:
    normalized = value.strip()
    if not normalized or normalized in {"test-key", "sk-..."}:
        raise RuntimeError(f"{name} is not configured.")
    return normalized


def _openai_base_url(provider: str) -> str:
    configured = settings.openai_base_url.strip()
    if configured:
        return configured
    return _DEFAULT_OPENAI_BASE_URLS.get(provider, "")


def _get_openai_client(provider: str) -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = _require_setting("OPENAI_API_KEY", settings.openai_api_key)
        kwargs: dict[str, Any] = {"api_key": api_key}
        base_url = _openai_base_url(provider)
        if provider in _OPENAI_COMPATIBLE_PROVIDERS and not base_url:
            raise RuntimeError(
                "OPENAI_BASE_URL is required for openai-compatible providers.",
            )
        if base_url:
            kwargs["base_url"] = base_url
        _openai_client = AsyncOpenAI(**kwargs)
    return _openai_client


def _get_anthropic_client() -> Any:
    global _anthropic_client
    if _anthropic_client is None:
        try:
            from anthropic import AsyncAnthropic
        except ImportError as exc:
            raise RuntimeError(
                "Anthropic support is not installed. Rebuild the backend with updated requirements.",
            ) from exc
        api_key = _require_setting("ANTHROPIC_API_KEY", settings.anthropic_api_key)
        _anthropic_client = AsyncAnthropic(api_key=api_key)
    return _anthropic_client


def _anthropic_model() -> str:
    model = settings.anthropic_model.strip() or settings.openai_model.strip()
    if not model:
        raise RuntimeError("No Anthropic model is configured.")
    return model


async def _complete_with_openai_compatible(
    provider: str,
    messages: list[dict[str, str]],
) -> LLMResponse:
    client = _get_openai_client(provider)
    logger.debug("Calling provider=%s model=%s messages=%d", provider, settings.openai_model, len(messages))
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,  # type: ignore[arg-type]
        temperature=settings.llm_temperature,
        max_tokens=settings.llm_max_tokens,
    )
    choice = response.choices[0]
    usage = response.usage
    return LLMResponse(
        text=choice.message.content or "",
        prompt_tokens=usage.prompt_tokens if usage else 0,
        completion_tokens=usage.completion_tokens if usage else 0,
    )


async def _complete_with_anthropic(messages: list[dict[str, str]]) -> LLMResponse:
    client = _get_anthropic_client()
    system_prompt = "\n\n".join(
        message["content"].strip()
        for message in messages
        if message.get("role") == "system" and message.get("content", "").strip()
    )
    anthropic_messages = [
        {"role": message["role"], "content": message["content"].strip()}
        for message in messages
        if message.get("role") in {"user", "assistant"} and message.get("content", "").strip()
    ]
    if not anthropic_messages:
        raise RuntimeError("No user message is available for the Anthropic request.")

    logger.debug(
        "Calling provider=anthropic model=%s messages=%d",
        _anthropic_model(),
        len(anthropic_messages),
    )
    response = await client.messages.create(
        model=_anthropic_model(),
        max_tokens=settings.llm_max_tokens,
        temperature=settings.llm_temperature,
        system=system_prompt,
        messages=anthropic_messages,
    )
    text = "".join(
        block.text
        for block in response.content
        if getattr(block, "type", "") == "text"
    )
    usage = getattr(response, "usage", None)
    return LLMResponse(
        text=text,
        prompt_tokens=getattr(usage, "input_tokens", 0) if usage else 0,
        completion_tokens=getattr(usage, "output_tokens", 0) if usage else 0,
    )


async def complete(messages: list[dict[str, str]]) -> LLMResponse:
    """Send messages to the configured LLM provider and return the reply."""
    provider = _normalize_provider()
    if provider == "anthropic":
        return await _complete_with_anthropic(messages)
    if provider == "openai" or provider in _OPENAI_COMPATIBLE_PROVIDERS:
        return await _complete_with_openai_compatible(provider, messages)
    raise RuntimeError(f"Unsupported LLM provider: {provider}")
