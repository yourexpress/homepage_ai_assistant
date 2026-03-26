"""FastAPI application factory."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, health, metrics
from app.config import settings
from app.middleware.concurrency import ConcurrencyLimiterMiddleware
from app.middleware.rate_limiter import RateLimiterMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def create_app() -> FastAPI:
    application = FastAPI(
        title="Portfolio AI Assistant",
        description="Chat with a controlled LLM assistant about the owner's public portfolio.",
        version="1.0.0",
    )

    # CORS — must be registered before rate/concurrency middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins_list,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    # Rate limiter — runs before concurrency limiter
    application.add_middleware(
        RateLimiterMiddleware,
        capacity=settings.rate_limit_burst,
        refill_interval=settings.rate_limit_refill_interval,
    )

    # Concurrency limiter
    application.add_middleware(
        ConcurrencyLimiterMiddleware,
        max_concurrent=settings.max_concurrent_requests,
    )

    application.include_router(health.router, prefix="/api")
    application.include_router(chat.router, prefix="/api")
    application.include_router(metrics.router, prefix="/api")

    return application


app = create_app()
