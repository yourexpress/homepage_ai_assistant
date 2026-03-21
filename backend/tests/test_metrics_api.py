"""Integration tests for the GET /api/metrics endpoint."""

from __future__ import annotations

import pytest


class TestMetricsEndpoint:
    async def test_returns_200(self, client):
        response = await client.get("/api/metrics")
        assert response.status_code == 200

    async def test_returns_json(self, client):
        response = await client.get("/api/metrics")
        data = response.json()
        assert isinstance(data, dict)

    async def test_response_has_required_fields(self, client):
        response = await client.get("/api/metrics")
        data = response.json()
        required = {
            "total_requests",
            "blocked_requests",
            "llm_requests",
            "successful_responses",
            "rate_limited_requests",
            "concurrency_rejected_requests",
            "latency_buckets",
            "total_prompt_tokens",
            "total_completion_tokens",
        }
        assert required.issubset(data.keys())

    async def test_latency_buckets_has_correct_keys(self, client):
        response = await client.get("/api/metrics")
        buckets = response.json()["latency_buckets"]
        assert set(buckets.keys()) == {"lt_1s", "1s_to_3s", "3s_to_10s", "gt_10s"}

    async def test_counters_are_integers(self, client):
        response = await client.get("/api/metrics")
        data = response.json()
        for field in ("total_requests", "blocked_requests", "llm_requests"):
            assert isinstance(data[field], int)

    async def test_metrics_reflect_chat_activity(self, client):
        await client.post("/api/chat", json={"message": "What is Alex's background?"})
        response = await client.get("/api/metrics")
        data = response.json()
        assert data["total_requests"] >= 1
