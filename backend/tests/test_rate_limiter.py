"""Tests for the token-bucket rate limiter middleware."""

from __future__ import annotations

import hashlib
import time
from unittest.mock import MagicMock, patch

import pytest

from app.middleware.rate_limiter import RateLimiterMiddleware, _Bucket


class TestBucketMechanics:
    """Unit tests for the bucket consume logic (via a minimal middleware instance)."""

    def _make_mw(self, capacity: int = 5, refill_interval: float = 60.0):
        # We pass a dummy app; we only test _consume
        mw = RateLimiterMiddleware.__new__(RateLimiterMiddleware)
        mw._capacity = capacity
        mw._refill_interval = refill_interval
        mw._buckets = {}
        return mw

    def test_fresh_bucket_allows_up_to_capacity(self):
        mw = self._make_mw(capacity=5)
        for _ in range(5):
            allowed, _ = mw._consume("key1")
            assert allowed is True

    def test_bucket_exhausted_after_capacity(self):
        mw = self._make_mw(capacity=3)
        for _ in range(3):
            mw._consume("key2")
        allowed, retry_after = mw._consume("key2")
        assert allowed is False
        assert retry_after > 0

    def test_retry_after_is_positive_when_denied(self):
        mw = self._make_mw(capacity=1)
        mw._consume("key3")  # exhaust
        _, retry_after = mw._consume("key3")
        assert retry_after > 0

    def test_different_keys_have_independent_buckets(self):
        mw = self._make_mw(capacity=1)
        allowed_a, _ = mw._consume("keyA")
        allowed_a2, _ = mw._consume("keyA")  # exhausted
        allowed_b, _ = mw._consume("keyB")  # fresh bucket
        assert allowed_a is True
        assert allowed_a2 is False
        assert allowed_b is True

    def test_tokens_refill_over_time(self):
        mw = self._make_mw(capacity=2, refill_interval=1.0)
        mw._consume("refill")
        mw._consume("refill")  # empty
        # Simulate time passing by manipulating last_refill
        mw._buckets["refill"].last_refill -= 1.5  # 1.5 tokens should have refilled
        allowed, _ = mw._consume("refill")
        assert allowed is True

    def test_tokens_do_not_exceed_capacity(self):
        mw = self._make_mw(capacity=3, refill_interval=1.0)
        # Simulate a long time passing
        mw._buckets["cap"] = _Bucket(tokens=0, last_refill=time.monotonic() - 1000)
        allowed, _ = mw._consume("cap")
        assert allowed is True
        # Tokens should be capped at capacity - 1 (we consumed one)
        assert mw._buckets["cap"].tokens <= mw._capacity


class TestRateLimiterBurstBehaviour:
    """Verify the full burst + degraded behaviour at capacity=10."""

    def test_ten_requests_allowed_then_blocked(self):
        mw = RateLimiterMiddleware.__new__(RateLimiterMiddleware)
        mw._capacity = 10
        mw._refill_interval = 60.0
        mw._buckets = {}

        results = [mw._consume("ip")[0] for _ in range(11)]
        assert all(results[:10])   # first 10 allowed
        assert results[10] is False  # 11th blocked

    def test_retry_after_approximately_one_refill_interval(self):
        mw = RateLimiterMiddleware.__new__(RateLimiterMiddleware)
        mw._capacity = 10
        mw._refill_interval = 600.0  # 600 s = 10 min
        mw._buckets = {}

        for _ in range(10):
            mw._consume("ip2")
        _, retry_after = mw._consume("ip2")
        # Should be close to one full refill interval
        assert 500 < retry_after <= 600


class TestClientKeyResolution:
    """Tests for _get_client_key() under various proxy/client configurations."""

    def _make_mw(self):
        mw = RateLimiterMiddleware.__new__(RateLimiterMiddleware)
        mw._capacity = 10
        mw._refill_interval = 600.0
        mw._buckets = {}
        return mw

    def _make_request(self, host="127.0.0.1", forwarded_for=None, client=True):
        """Build a mock Request with configurable client and headers."""
        request = MagicMock()
        if client:
            request.client = MagicMock()
            request.client.host = host
        else:
            request.client = None
        headers = {}
        if forwarded_for is not None:
            headers["X-Forwarded-For"] = forwarded_for
        request.headers = headers
        return request

    @patch("app.middleware.rate_limiter.settings")
    def test_client_key_without_proxy(self, mock_settings):
        """Direct connection uses request.client.host."""
        mock_settings.trust_proxy_headers = False
        mw = self._make_mw()
        request = self._make_request(host="192.168.1.1")
        key = mw._get_client_key(request)
        expected = hashlib.sha256("192.168.1.1".encode()).hexdigest()[:16]
        assert key == expected

    @patch("app.middleware.rate_limiter.settings")
    def test_client_key_with_proxy_header(self, mock_settings):
        """When trusting proxy, reads X-Forwarded-For."""
        mock_settings.trust_proxy_headers = True
        mw = self._make_mw()
        request = self._make_request(host="10.0.0.1", forwarded_for="203.0.113.50")
        key = mw._get_client_key(request)
        expected = hashlib.sha256("203.0.113.50".encode()).hexdigest()[:16]
        assert key == expected

    @patch("app.middleware.rate_limiter.settings")
    def test_client_key_with_multiple_forwarded_ips(self, mock_settings):
        """Multiple X-Forwarded-For entries → first IP is used."""
        mock_settings.trust_proxy_headers = True
        mw = self._make_mw()
        request = self._make_request(
            host="10.0.0.1",
            forwarded_for="203.0.113.50, 198.51.100.10, 10.0.0.1",
        )
        key = mw._get_client_key(request)
        expected = hashlib.sha256("203.0.113.50".encode()).hexdigest()[:16]
        assert key == expected

    @patch("app.middleware.rate_limiter.settings")
    def test_client_key_without_client(self, mock_settings):
        """When request.client is None, falls back to 'unknown'."""
        mock_settings.trust_proxy_headers = False
        mw = self._make_mw()
        request = self._make_request(client=False)
        key = mw._get_client_key(request)
        expected = hashlib.sha256("unknown".encode()).hexdigest()[:16]
        assert key == expected

    @patch("app.middleware.rate_limiter.settings")
    def test_client_key_with_empty_forwarded_header(self, mock_settings):
        """Empty X-Forwarded-For falls back to request.client.host."""
        mock_settings.trust_proxy_headers = True
        mw = self._make_mw()
        request = self._make_request(host="192.168.1.1", forwarded_for="")
        key = mw._get_client_key(request)
        expected = hashlib.sha256("192.168.1.1".encode()).hexdigest()[:16]
        assert key == expected
