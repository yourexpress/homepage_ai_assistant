"""POST /api/chat endpoint."""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException

from app.models import ChatRequest, ChatResponse
from app.services import happy_auth, llm_client, policy_guard
from app.services.metrics_store import metrics

logger = logging.getLogger("chat")
router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Accept a visitor message and return an LLM-generated reply.

    The middleware stack (rate limiter, concurrency limiter) runs before this
    handler is invoked.  Here we apply the policy pre-filter and call the LLM.
    """
    metrics.record_request()

    # Policy pre-filter
    if policy_guard.is_blocked(request.message):
        metrics.record_blocked()
        logger.info("Message blocked by policy pre-filter")
        return ChatResponse(
            reply="I'm sorry, I can't help with that request. "
                  "I'm only able to discuss my owner's public portfolio, "
                  "projects, and experience.",
            blocked=True,
        )

    # Build prompt
    happy_mode_active = happy_auth.token_is_valid(request.happy_token, request.session_id)
    history = [item.model_dump() for item in request.history]
    messages = policy_guard.build_messages(
        request.message,
        history=history,
        happy_mode=happy_mode_active,
    )

    # Call LLM
    metrics.record_llm_request()
    start = time.monotonic()
    try:
        result = await llm_client.complete(messages)
    except RuntimeError as exc:
        logger.warning("LLM configuration error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("LLM call failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again later.",
        ) from exc
    latency = time.monotonic() - start

    metrics.record_response(
        latency_seconds=latency,
        prompt_tokens=result.prompt_tokens,
        completion_tokens=result.completion_tokens,
    )
    logger.info("LLM response latency=%.2fs tokens=%d", latency, result.completion_tokens)

    return ChatResponse(reply=result.text, happy_mode_active=happy_mode_active)
