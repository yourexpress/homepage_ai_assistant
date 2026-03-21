"""Concurrency-limiting middleware.

Uses an asyncio.Semaphore to cap the number of simultaneously in-flight
requests being processed.  Excess requests receive an immediate 503 rather
than queuing indefinitely, which prevents memory exhaustion and keeps
response times predictable.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.metrics_store import metrics

logger = logging.getLogger("concurrency")


class ConcurrencyLimiterMiddleware(BaseHTTPMiddleware):
    """Limit the number of concurrently processed requests."""

    def __init__(self, app, max_concurrent: int) -> None:
        super().__init__(app)
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._max = max_concurrent

    async def dispatch(self, request: Request, call_next) -> Response:
        # Only guard the chat endpoint
        if request.url.path != "/api/chat":
            return await call_next(request)

        acquired = self._semaphore.locked() is False  # optimistic check
        # Non-blocking check: if all slots are occupied, reject immediately.
        # Semaphore.locked() returns True only when the internal counter is 0.
        # Since asyncio is single-threaded, the check + acquire pair is atomic
        # (no await between them means no other coroutine can run in between).
        if self._semaphore.locked():
            metrics.record_concurrency_rejected()
            logger.warning("Concurrency limit (%d) exceeded", self._max)
            return Response(
                content='{"error":"Server is busy. Please try again shortly."}',
                status_code=503,
                media_type="application/json",
                headers={"Retry-After": "5"},
            )
        await self._semaphore.acquire()

        try:
            return await call_next(request)
        finally:
            self._semaphore.release()
