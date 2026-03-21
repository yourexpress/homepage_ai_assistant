"""GET /api/metrics endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.models import MetricsResponse
from app.services.metrics_store import metrics

logger = logging.getLogger("metrics")
router = APIRouter()


@router.get("/metrics", response_model=MetricsResponse)
async def get_metrics() -> MetricsResponse:
    """Return a snapshot of operational metrics.

    All counters are in-memory and reset on process restart.
    """
    snap = metrics.snapshot()
    return MetricsResponse(**snap)
