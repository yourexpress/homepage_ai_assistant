"""Test fixtures shared across the test suite."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.services import llm_client
from app.services.metrics_store import MetricsStore, metrics


@pytest.fixture()
def reset_metrics():
    """Reset the global metrics store before each test."""
    store_attrs = [
        "total_requests",
        "blocked_requests",
        "llm_requests",
        "successful_responses",
        "rate_limited_requests",
        "concurrency_rejected_requests",
        "total_prompt_tokens",
        "total_completion_tokens",
    ]
    for attr in store_attrs:
        setattr(metrics, attr, 0)
    metrics.latency_buckets = {"lt_1s": 0, "1s_to_3s": 0, "3s_to_10s": 0, "gt_10s": 0}


@pytest.fixture()
def mock_llm(monkeypatch):
    """Replace the real LLM client with a fast stub."""
    fake_response = MagicMock()
    fake_response.text = "Mocked LLM response."
    fake_response.prompt_tokens = 10
    fake_response.completion_tokens = 20

    async_complete = AsyncMock(return_value=fake_response)
    monkeypatch.setattr(llm_client, "complete", async_complete)
    return async_complete


@pytest.fixture()
async def client(mock_llm, reset_metrics):
    """HTTP test client backed by a fresh app instance."""
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
