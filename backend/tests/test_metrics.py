"""Tests for the in-memory metrics store."""

from __future__ import annotations

import pytest

from app.services.metrics_store import MetricsStore


@pytest.fixture()
def store():
    return MetricsStore()


class TestMetricsStore:
    def test_initial_counters_are_zero(self, store):
        snap = store.snapshot()
        assert snap["total_requests"] == 0
        assert snap["blocked_requests"] == 0
        assert snap["llm_requests"] == 0
        assert snap["successful_responses"] == 0
        assert snap["rate_limited_requests"] == 0
        assert snap["concurrency_rejected_requests"] == 0
        assert snap["total_prompt_tokens"] == 0
        assert snap["total_completion_tokens"] == 0

    def test_record_request_increments(self, store):
        store.record_request()
        store.record_request()
        assert store.snapshot()["total_requests"] == 2

    def test_record_blocked_increments(self, store):
        store.record_blocked()
        assert store.snapshot()["blocked_requests"] == 1

    def test_record_rate_limited_increments(self, store):
        store.record_rate_limited()
        assert store.snapshot()["rate_limited_requests"] == 1

    def test_record_concurrency_rejected_increments(self, store):
        store.record_concurrency_rejected()
        assert store.snapshot()["concurrency_rejected_requests"] == 1

    def test_record_llm_request_increments(self, store):
        store.record_llm_request()
        assert store.snapshot()["llm_requests"] == 1

    def test_record_response_increments_successful(self, store):
        store.record_response(latency_seconds=0.5)
        assert store.snapshot()["successful_responses"] == 1

    def test_latency_bucket_lt_1s(self, store):
        store.record_response(latency_seconds=0.5)
        assert store.snapshot()["latency_buckets"]["lt_1s"] == 1

    def test_latency_bucket_1s_to_3s(self, store):
        store.record_response(latency_seconds=2.0)
        assert store.snapshot()["latency_buckets"]["1s_to_3s"] == 1

    def test_latency_bucket_3s_to_10s(self, store):
        store.record_response(latency_seconds=5.0)
        assert store.snapshot()["latency_buckets"]["3s_to_10s"] == 1

    def test_latency_bucket_gt_10s(self, store):
        store.record_response(latency_seconds=15.0)
        assert store.snapshot()["latency_buckets"]["gt_10s"] == 1

    def test_token_counts_accumulated(self, store):
        store.record_response(0.5, prompt_tokens=100, completion_tokens=50)
        store.record_response(0.5, prompt_tokens=200, completion_tokens=75)
        snap = store.snapshot()
        assert snap["total_prompt_tokens"] == 300
        assert snap["total_completion_tokens"] == 125

    def test_snapshot_returns_copy(self, store):
        snap1 = store.snapshot()
        store.record_request()
        snap2 = store.snapshot()
        assert snap1["total_requests"] != snap2["total_requests"]

    def test_initial_latency_buckets_present(self, store):
        snap = store.snapshot()
        assert set(snap["latency_buckets"].keys()) == {
            "lt_1s",
            "1s_to_3s",
            "3s_to_10s",
            "gt_10s",
        }
