"""Token-bucket rate limiter middleware.

Each client IP gets an independent token bucket.

Bucket parameters (from settings):
  - capacity = RATE_LIMIT_BURST  (default 10)
  - refill    = 1 token every RATE_LIMIT_REFILL_INTERVAL seconds (default 600 s = 10 min)

This gives the specified behaviour:
  - Burst: up to 10 requests immediately when the bucket is full.
  - Degraded: once the bucket empties, 1 request every 10 minutes.

State is stored in an in-process dict; suitable for single-instance
deployments.  Replace with a Redis backend for multi-instance correctness.
"""

from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.services.metrics_store import metrics

logger = logging.getLogger("rate_limiter")


@dataclass
class _Bucket:
    tokens: float
    last_refill: float = field(default_factory=time.monotonic)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Token-bucket rate limiter applied to /api/chat."""

    def __init__(self, app, capacity: int, refill_interval: float) -> None:
        super().__init__(app)
        self._capacity = capacity
        self._refill_interval = refill_interval  # seconds per token
        self._buckets: dict[str, _Bucket] = {}

    def _get_client_key(self, request: Request) -> str:
        """Return a stable, opaque key for the client IP."""
        if settings.trust_proxy_headers:
            forwarded = request.headers.get("X-Forwarded-For", "")
            ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
        else:
            ip = request.client.host if request.client else "unknown"
        # Hash the IP so it is never stored in plain text
        return hashlib.sha256(ip.encode()).hexdigest()[:16]

    def _consume(self, key: str) -> tuple[bool, float]:
        """Try to consume one token from the bucket.

        Returns (allowed, retry_after_seconds).
        """
        now = time.monotonic()
        if key not in self._buckets:
            self._buckets[key] = _Bucket(tokens=self._capacity, last_refill=now)

        bucket = self._buckets[key]
        # Refill tokens based on elapsed time
        elapsed = now - bucket.last_refill
        new_tokens = elapsed / self._refill_interval
        bucket.tokens = min(self._capacity, bucket.tokens + new_tokens)
        bucket.last_refill = now

        if bucket.tokens >= 1:
            bucket.tokens -= 1
            return True, 0.0

        # Calculate how long until 1 token is available
        wait = (1 - bucket.tokens) * self._refill_interval
        return False, wait

    async def dispatch(self, request: Request, call_next) -> Response:
        # Only rate-limit the chat endpoint
        if request.url.path != "/api/chat":
            return await call_next(request)

        key = self._get_client_key(request)
        allowed, retry_after = self._consume(key)

        if not allowed:
            metrics.record_rate_limited()
            logger.info("Rate limit exceeded for key=%s retry_after=%.1fs", key, retry_after)
            return Response(
                content='{"error":"Rate limit exceeded. Please wait before sending another message."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(int(retry_after) + 1)},
            )

        return await call_next(request)
