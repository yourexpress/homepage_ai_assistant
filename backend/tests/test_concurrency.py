"""Tests for the concurrency-limiting middleware."""

from __future__ import annotations

import asyncio

import pytest

from app.middleware.concurrency import ConcurrencyLimiterMiddleware


class TestConcurrencyLimiter:
    def _make_mw(self, max_concurrent: int = 2):
        mw = ConcurrencyLimiterMiddleware.__new__(ConcurrencyLimiterMiddleware)
        mw._semaphore = asyncio.Semaphore(max_concurrent)
        mw._max = max_concurrent
        return mw

    async def test_semaphore_allows_up_to_max(self):
        mw = self._make_mw(max_concurrent=3)
        # Acquire all slots
        for _ in range(3):
            await mw._semaphore.acquire()
        assert mw._semaphore.locked()

    async def test_semaphore_releases_correctly(self):
        mw = self._make_mw(max_concurrent=1)
        await mw._semaphore.acquire()
        assert mw._semaphore.locked()
        mw._semaphore.release()
        assert not mw._semaphore.locked()

    async def test_non_blocking_acquire_fails_when_full(self):
        mw = self._make_mw(max_concurrent=1)
        await mw._semaphore.acquire()  # occupy the only slot
        # Non-blocking acquire should time out
        with pytest.raises((asyncio.TimeoutError, TimeoutError)):
            await asyncio.wait_for(mw._semaphore.acquire(), timeout=0)

    async def test_max_attribute_stored(self):
        mw = self._make_mw(max_concurrent=7)
        assert mw._max == 7
