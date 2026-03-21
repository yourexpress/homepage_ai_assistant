"""Thread-safe in-memory metrics accumulator."""

from __future__ import annotations

import threading


class MetricsStore:
    """Accumulates request and latency counters.

    All public methods are thread-safe via a reentrant lock.
    Counters reset on process restart (acceptable for portfolio use-case).
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.total_requests: int = 0
        self.blocked_requests: int = 0
        self.llm_requests: int = 0
        self.successful_responses: int = 0
        self.rate_limited_requests: int = 0
        self.concurrency_rejected_requests: int = 0
        self.total_prompt_tokens: int = 0
        self.total_completion_tokens: int = 0
        # Latency buckets (seconds): <1, 1-3, 3-10, >10
        self.latency_buckets: dict[str, int] = {
            "lt_1s": 0,
            "1s_to_3s": 0,
            "3s_to_10s": 0,
            "gt_10s": 0,
        }

    def record_request(self) -> None:
        with self._lock:
            self.total_requests += 1

    def record_blocked(self) -> None:
        with self._lock:
            self.blocked_requests += 1

    def record_rate_limited(self) -> None:
        with self._lock:
            self.rate_limited_requests += 1

    def record_concurrency_rejected(self) -> None:
        with self._lock:
            self.concurrency_rejected_requests += 1

    def record_llm_request(self) -> None:
        with self._lock:
            self.llm_requests += 1

    def record_response(
        self,
        latency_seconds: float,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
    ) -> None:
        with self._lock:
            self.successful_responses += 1
            self.total_prompt_tokens += prompt_tokens
            self.total_completion_tokens += completion_tokens
            if latency_seconds < 1:
                self.latency_buckets["lt_1s"] += 1
            elif latency_seconds < 3:
                self.latency_buckets["1s_to_3s"] += 1
            elif latency_seconds < 10:
                self.latency_buckets["3s_to_10s"] += 1
            else:
                self.latency_buckets["gt_10s"] += 1

    def snapshot(self) -> dict:
        with self._lock:
            return {
                "total_requests": self.total_requests,
                "blocked_requests": self.blocked_requests,
                "llm_requests": self.llm_requests,
                "successful_responses": self.successful_responses,
                "rate_limited_requests": self.rate_limited_requests,
                "concurrency_rejected_requests": self.concurrency_rejected_requests,
                "latency_buckets": dict(self.latency_buckets),
                "total_prompt_tokens": self.total_prompt_tokens,
                "total_completion_tokens": self.total_completion_tokens,
            }


# Singleton instance shared across the application
metrics = MetricsStore()
