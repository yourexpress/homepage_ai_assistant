"""GET /api/health and GET /api/readiness endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.config import settings
from app.models import HealthResponse, ReadinessResponse
from app.services.knowledge_base import get_context

logger = logging.getLogger("health")
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Shallow liveness check — process is running."""
    return HealthResponse(status="ok", version=settings.app_version)


@router.get("/readiness", response_model=ReadinessResponse)
async def readiness_check() -> ReadinessResponse:
    """Deep readiness check — verify that dependencies are reachable.

    Checks:
    - knowledge_base: loaded context is > 100 chars
    - llm_configured: API key is not the placeholder default
    """
    checks: dict[str, str] = {}

    # Check 1: Knowledge base loaded?
    try:
        ctx = get_context()
        checks["knowledge_base"] = "ok" if len(ctx) > 100 else "degraded"
    except Exception:
        logger.exception("knowledge base check failed")
        checks["knowledge_base"] = "unavailable"

    # Check 2: LLM reachable? (Phase 1 — cheap heuristic: key is configured)
    # TODO: Phase 2 — add a lightweight API ping
    checks["llm_configured"] = (
        "ok" if settings.openai_api_key != "test-key" else "not_configured"
    )

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"

    return ReadinessResponse(
        status=overall,
        version=settings.app_version,
        checks=checks,
    )
