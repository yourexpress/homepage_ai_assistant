# Request Control Model: Portfolio AI Assistant

> Design specification for rate limiting, concurrency control, input validation,
> and visitor identity resolution in a public-facing portfolio AI assistant.

---

## Table of Contents

1. [Visitor Identity Strategy Options](#1-visitor-identity-strategy-options)
2. [Rate Limiting Algorithm Options](#2-rate-limiting-algorithm-options)
3. [Recommended Final Design](#3-recommended-final-design)
4. [Concurrency Limiting Design](#4-concurrency-limiting-design)
5. [Queue vs Reject Tradeoff](#5-queue-vs-reject-tradeoff)
6. [Suggested HTTP Status Codes](#6-suggested-http-status-codes)
7. [Error Response Schema](#7-error-response-schema)
8. [Observability Signals](#8-observability-signals)
9. [Pseudocode for the Limiter](#9-pseudocode-for-the-limiter)
10. [Edge Cases](#10-edge-cases)
11. [Test Plan for This Subsystem](#11-test-plan-for-this-subsystem)

---

## 1. Visitor Identity Strategy Options

### 1.1 Context

The assistant is served from a GitHub Pages frontend to a FastAPI backend.
Visitors are anonymous — there is no authentication.  A stable "visitor
identity" is needed to track per-user request budgets.

### 1.2 Options Considered

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| **Client IP address** | Use `request.client.host` or `X-Forwarded-For` header | Simple; no client cooperation required; works for every HTTP client | Shared IPs (NAT, corporate proxies) may unfairly throttle multiple users; VPN users can rotate IPs to evade limits |
| **Browser fingerprint** | Client-side JS computes a device fingerprint and sends it as a header | More stable per-device than IP alone | Easy to forge; requires client cooperation; adds JS complexity; privacy concerns |
| **Session cookie** | Server issues a unique cookie on first request | Stable per-browser session; easy to implement | Cookies can be cleared or blocked; not reliable for rate limiting |
| **API token** | Visitor registers and receives a unique token | Most accurate identity; enables per-user quotas | Requires registration flow; high friction for a portfolio site |
| **Composite (IP + fingerprint)** | Combine IP with optional fingerprint | More accurate than either alone | Higher complexity; still bypassable |

### 1.3 Selected Strategy: Hashed Client IP

**Decision:** Use client IP address, hashed with SHA-256 and truncated to 16
hex characters.  This provides:

- **Zero client cooperation** — works with any HTTP client, including curl.
- **Privacy** — the raw IP is never stored or logged.
- **Simplicity** — no registration, cookies, or client-side code needed.
- **Sufficient accuracy** — acceptable for a portfolio site where the threat
  model is casual abuse, not determined attackers.

**Implementation** (`app/middleware/rate_limiter.py`):

```python
def _get_client_key(self, request: Request) -> str:
    if settings.trust_proxy_headers:
        forwarded = request.headers.get("X-Forwarded-For", "")
        ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
    else:
        ip = request.client.host if request.client else "unknown"
    return hashlib.sha256(ip.encode()).hexdigest()[:16]
```

**Proxy support:** When deployed behind a reverse proxy (Render, Fly.io), set
`TRUST_PROXY_HEADERS=true` to read the real client IP from `X-Forwarded-For`.
The first entry in the comma-separated list is used (set by the nearest trusted
proxy).

---

## 2. Rate Limiting Algorithm Options

### 2.1 Options Considered

| Algorithm | Description | Burst Handling | Memory | Complexity |
|-----------|-------------|----------------|--------|------------|
| **Fixed window** | Count requests in fixed time windows (e.g. per minute) | Allows 2× burst at window boundary | Low | Low |
| **Sliding window log** | Store timestamps of all recent requests | No boundary burst | High (per-request storage) | Medium |
| **Sliding window counter** | Weighted average of current + previous window | Approximate; minimal boundary burst | Low | Medium |
| **Token bucket** | Bucket starts full; consumes 1 token per request; refills at fixed rate | Natural burst allowance up to bucket capacity | Low (one bucket per key) | Low |
| **Leaky bucket** | Requests queue and drain at a constant rate | No burst — constant output rate | Medium (queue) | Medium |

### 2.2 Selected Algorithm: Token Bucket

**Decision:** Token bucket is the best fit because:

1. **Natural burst handling** — the 10-burst requirement maps directly to
   bucket capacity.
2. **Degraded rate** — after burst, 1 token refills every `refill_interval`
   seconds, producing exactly the "1 question every 10 minutes" degraded rate.
3. **Low memory** — one `(tokens: float, last_refill: float)` pair per client.
4. **Simple implementation** — no background tasks; refill is calculated lazily
   on each request.
5. **Predictable Retry-After** — the wait time until the next token is a simple
   arithmetic formula.

### 2.3 Token Bucket Mechanics

```
On each request for client C:
  1. Calculate elapsed = now - bucket[C].last_refill
  2. new_tokens = elapsed / refill_interval
  3. bucket[C].tokens = min(capacity, bucket[C].tokens + new_tokens)
  4. bucket[C].last_refill = now
  5. If bucket[C].tokens >= 1:
       bucket[C].tokens -= 1
       → ALLOW
     Else:
       wait = (1 - bucket[C].tokens) * refill_interval
       → DENY (Retry-After: wait)
```

---

## 3. Recommended Final Design

### 3.1 Architecture Overview

```
Request arrives
  │
  ├─ CORS middleware (allow/deny origin)
  │
  ├─ Rate limiter middleware (/api/chat only)
  │     ├─ Extract client IP → hash to key
  │     ├─ Token bucket check
  │     │     ├─ ALLOW → continue
  │     │     └─ DENY → 429 + Retry-After
  │     │
  ├─ Concurrency limiter middleware (/api/chat only)
  │     ├─ Semaphore check (non-blocking)
  │     │     ├─ AVAILABLE → acquire, continue
  │     │     └─ FULL → 503 + Retry-After: 5
  │     │
  ├─ FastAPI route handler
  │     ├─ Pydantic input validation (length check)
  │     │     └─ INVALID → 422
  │     ├─ Policy pre-filter (regex patterns)
  │     │     └─ BLOCKED → 200 + polite refusal
  │     ├─ LLM call
  │     │     └─ ERROR → 500
  │     └─ 200 + reply
```

### 3.2 Parameters

| Parameter | Config Key | Default | Rationale |
|-----------|-----------|---------|-----------|
| Burst capacity | `RATE_LIMIT_BURST` | 10 | Allow 10 questions in quick succession |
| Refill interval | `RATE_LIMIT_REFILL_INTERVAL` | 600 s | 1 token / 10 min degraded rate |
| Max concurrent | `MAX_CONCURRENT_REQUESTS` | 10 | Limit in-flight LLM calls |
| Max input length | `MAX_INPUT_LENGTH` | 1000 chars | Prevent prompt abuse |
| Trust proxy headers | `TRUST_PROXY_HEADERS` | false | Enable when behind reverse proxy |

### 3.3 Middleware Ordering

FastAPI applies middleware in reverse registration order.  The registration
order in `app/main.py` is:

1. CORS middleware (registered first → runs last in the middleware chain)
2. Rate limiter middleware (registered second)
3. Concurrency limiter middleware (registered third → runs first)

This means the actual execution order for an incoming request is:

```
Incoming → Concurrency limiter → Rate limiter → CORS → Route handler
```

However, because both the rate limiter and concurrency limiter only act on
`/api/chat` (they call `call_next` for other paths), and the CORS middleware
handles preflight OPTIONS requests, the effective order is:

- **Rate limiter runs before concurrency limiter** for `/api/chat` requests
  (middleware registered earlier wraps middleware registered later in Starlette).
- Rate-limited requests never consume a concurrency slot.

### 3.4 State Management

- **In-process `dict`** — each client key maps to a `_Bucket(tokens, last_refill)`.
- **Single-instance only** — if the backend scales horizontally, migrate bucket
  state to Redis or a shared store.
- **No cleanup task** — stale buckets accumulate but are small (≈ 40 bytes each).
  For a portfolio site, memory pressure is negligible.

---

## 4. Concurrency Limiting Design

### 4.1 Purpose

Rate limiting caps requests **over time**; concurrency limiting caps requests
**at any instant**.  Even if a visitor's rate budget allows a request, the
server may not have capacity to process it right now (e.g. 10 LLM calls
already in flight).

### 4.2 Mechanism: asyncio.Semaphore

```python
class ConcurrencyLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_concurrent: int):
        super().__init__(app)
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._max = max_concurrent

    async def dispatch(self, request, call_next):
        if request.url.path != "/api/chat":
            return await call_next(request)

        if self._semaphore.locked():          # all slots occupied
            return Response(status_code=503)  # immediate reject
        await self._semaphore.acquire()       # guaranteed to succeed
        try:
            return await call_next(request)
        finally:
            self._semaphore.release()
```

### 4.3 Why asyncio.Semaphore Is Safe Here

- Python's asyncio event loop is **single-threaded**: between
  `self._semaphore.locked()` and `await self._semaphore.acquire()` there is
  no `await`, so no other coroutine can run.
- This makes the non-blocking check + acquire pair **atomic** within the
  event loop.

### 4.4 Configuration

| Parameter | Default | Notes |
|-----------|---------|-------|
| `MAX_CONCURRENT_REQUESTS` | 10 | Tune based on LLM provider rate limits and backend memory |

---

## 5. Queue vs Reject Tradeoff

### 5.1 Options

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| **Immediate reject** | Return 429/503 as soon as limit is hit | Predictable latency; no memory growth; clear signal to client | Visitors must retry manually |
| **Queue with timeout** | Hold excess requests in a bounded queue; process when capacity frees | Smoother UX for short bursts | Unbounded memory risk; unpredictable latency; complex timeout handling |
| **Queue with backpressure** | Accept into queue up to a bound, then reject | Compromise between the two | Still adds latency and complexity |

### 5.2 Decision: Immediate Reject

For a portfolio AI assistant:

1. **Simplicity** — no queue data structure, no timeout management, no
   partial-failure handling.
2. **Predictable latency** — every accepted request runs immediately.
3. **Memory safety** — no unbounded growth from queued requests.
4. **Clear signal** — the `Retry-After` header tells the client exactly when
   to retry.  The frontend can display a countdown or a friendly message.
5. **Portfolio scope** — visitors are casual; a polite "please wait" message
   is acceptable UX.

---

## 6. Suggested HTTP Status Codes

| Scenario | Status Code | Standard Meaning | Used By |
|----------|-------------|------------------|---------|
| Rate limit exceeded | **429** Too Many Requests | RFC 6585 — client has sent too many requests in a given time | Rate limiter middleware |
| Server concurrency limit | **503** Service Unavailable | RFC 7231 — server temporarily unable to handle request due to overload | Concurrency limiter middleware |
| Input validation failure | **422** Unprocessable Entity | RFC 4918 — well-formed request but semantic errors | Pydantic validator (FastAPI) |
| Policy-blocked content | **200** OK | Normal response | Chat endpoint (refusal in body with `blocked: true`) |
| LLM backend failure | **500** Internal Server Error | RFC 7231 — unexpected server error | Chat endpoint exception handler |
| Malformed JSON body | **422** Unprocessable Entity | Pydantic parse error | FastAPI request parsing |

### 6.1 Why 200 for Policy Refusals?

Policy refusals are **not errors** — they are a valid, intentional response.
Returning 200 with `blocked: true` allows the frontend to render refusals as
normal assistant messages rather than error states.  This provides a friendlier
UX and avoids noisy error-handling paths in the frontend.

### 6.2 Why Not 403 for Rate Limits?

**429** is semantically precise: it means "too many requests" and is the
standard mechanism for rate limiting.  **403** means "forbidden" and implies
the client will never be allowed, which is inaccurate — the client just needs
to wait.

---

## 7. Error Response Schema

### 7.1 Rate Limit (429)

```json
{
  "error": "Rate limit exceeded. Please wait before sending another message."
}
```

Headers:
- `Retry-After: <seconds>` — seconds until the next token is available
- `Content-Type: application/json`

### 7.2 Concurrency Limit (503)

```json
{
  "error": "Server is busy. Please try again shortly."
}
```

Headers:
- `Retry-After: 5`
- `Content-Type: application/json`

### 7.3 Input Validation (422)

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "message"],
      "msg": "Value error, Message exceeds maximum length of 1000 characters."
    }
  ]
}
```

### 7.4 Policy Refusal (200)

```json
{
  "reply": "I'm sorry, I can't help with that request. I'm only able to discuss my owner's public portfolio, projects, and experience.",
  "blocked": true
}
```

### 7.5 LLM Error (500)

```json
{
  "detail": "An unexpected error occurred. Please try again later."
}
```

### 7.6 Schema Invariants

1. **No internal details** — error messages never leak pattern names, config
   values, stack traces, or architecture details.
2. **Consistent `error` key** — rate limit and concurrency responses use
   `{"error": "..."}` for machine-parseable handling.
3. **Retry guidance** — all retryable responses (429, 503) include
   `Retry-After`.

---

## 8. Observability Signals

### 8.1 Metrics Counters

All counters are tracked in `app/services/metrics_store.py` and exposed via
`GET /api/metrics`.

| Counter | Incremented When | Significance |
|---------|-----------------|--------------|
| `total_requests` | Every chat request reaches the handler | Total demand |
| `blocked_requests` | Policy pre-filter rejects a message | Content policy activity |
| `rate_limited_requests` | Rate limiter returns 429 | Visitor hitting rate limits |
| `concurrency_rejected_requests` | Concurrency limiter returns 503 | Server under load |
| `llm_requests` | Request passes to LLM client | LLM demand |
| `successful_responses` | LLM returns a valid response | Successful completions |
| `total_prompt_tokens` | After LLM response | Token cost tracking |
| `total_completion_tokens` | After LLM response | Token cost tracking |

### 8.2 Latency Buckets

| Bucket | Range | Interpretation |
|--------|-------|----------------|
| `lt_1s` | < 1 s | Fast responses (cached or short) |
| `1s_to_3s` | 1–3 s | Normal LLM latency |
| `3s_to_10s` | 3–10 s | Slow but acceptable |
| `gt_10s` | > 10 s | Timeout risk — investigate LLM provider |

### 8.3 Log Signals

| Logger | Level | Event | Fields |
|--------|-------|-------|--------|
| `rate_limiter` | INFO | Rate limit exceeded | `key` (hashed), `retry_after` |
| `concurrency` | WARNING | Concurrency limit exceeded | `max` |
| `chat` | INFO | Message blocked by policy | — |
| `chat` | INFO | LLM response completed | `latency`, `tokens` |
| `chat` | ERROR | LLM call failed | Exception details |
| `policy_guard` | INFO | Blocked pattern matched | `pattern` |

### 8.4 Monitoring Recommendations

| Signal | Alert Threshold | Action |
|--------|----------------|--------|
| `rate_limited_requests` rising | > 50/hour | Check for automated abuse |
| `concurrency_rejected_requests` > 0 | Any occurrence | Consider scaling up or increasing limit |
| `gt_10s` latency bucket growing | > 10% of requests | Investigate LLM provider latency |
| `llm_requests` ÷ `total_requests` falling | < 50% | Heavy policy blocking — review patterns |

---

## 9. Pseudocode for the Limiter

### 9.1 Token Bucket Rate Limiter

```
CLASS TokenBucket:
  INIT(capacity, refill_interval):
    self.capacity = capacity           # max tokens (burst size)
    self.refill_interval = refill_interval  # seconds to add 1 token
    self.buckets = {}                  # key → {tokens, last_refill}

  METHOD get_client_key(request):
    IF trust_proxy_headers:
      ip = request.headers["X-Forwarded-For"].split(",")[0]
    ELSE:
      ip = request.client.host OR "unknown"
    RETURN sha256(ip)[:16]

  METHOD consume(key):
    now = monotonic_time()

    IF key NOT IN self.buckets:
      self.buckets[key] = {tokens: capacity, last_refill: now}

    bucket = self.buckets[key]
    elapsed = now - bucket.last_refill
    new_tokens = elapsed / self.refill_interval
    bucket.tokens = MIN(self.capacity, bucket.tokens + new_tokens)
    bucket.last_refill = now

    IF bucket.tokens >= 1:
      bucket.tokens -= 1
      RETURN (ALLOW, retry_after=0)
    ELSE:
      wait = (1 - bucket.tokens) * self.refill_interval
      RETURN (DENY, retry_after=wait)

  METHOD dispatch(request, call_next):
    IF request.path != "/api/chat":
      RETURN call_next(request)

    key = get_client_key(request)
    (allowed, retry_after) = consume(key)

    IF NOT allowed:
      metrics.record_rate_limited()
      RETURN Response(429, {"error": "Rate limit exceeded..."}, Retry-After=retry_after)

    RETURN call_next(request)
```

### 9.2 Concurrency Limiter

```
CLASS ConcurrencyLimiter:
  INIT(max_concurrent):
    self.semaphore = Semaphore(max_concurrent)
    self.max = max_concurrent

  METHOD dispatch(request, call_next):
    IF request.path != "/api/chat":
      RETURN call_next(request)

    IF semaphore.all_slots_occupied():
      metrics.record_concurrency_rejected()
      RETURN Response(503, {"error": "Server is busy..."}, Retry-After=5)

    semaphore.acquire()
    TRY:
      RETURN call_next(request)
    FINALLY:
      semaphore.release()
```

---

## 10. Edge Cases

### 10.1 Visitor Identity Edge Cases

| Case | Behaviour | Implementation |
|------|-----------|----------------|
| Missing `request.client` | Fall back to `"unknown"` — all such requests share one bucket | `request.client.host if request.client else "unknown"` |
| Empty `X-Forwarded-For` | Fall back to `request.client.host` | `forwarded.split(",")[0].strip() if forwarded else request.client.host` |
| Multiple IPs in `X-Forwarded-For` | Use the **first** entry (set by the nearest trusted proxy) | `forwarded.split(",")[0].strip()` |
| IPv6 address | Handled identically — SHA-256 hashing normalises any string | Hash is format-agnostic |
| NAT/shared IP | Multiple real users share one bucket; may be throttled unfairly | Accepted trade-off; mitigated by generous burst (10) |
| VPN/proxy rotation | User can get a fresh bucket by changing IP | Acceptable for portfolio scope; not a high-value target |

### 10.2 Rate Limiter Edge Cases

| Case | Behaviour |
|------|-----------|
| First request ever | Bucket created with full capacity (10 tokens) |
| Burst exhausted, immediate retry | Denied with `Retry-After` ≈ `refill_interval` |
| Long idle period after burst | Tokens refill up to capacity; full burst available again |
| Tokens never exceed capacity | `min(capacity, tokens + new_tokens)` caps at capacity |
| Fractional tokens | Float arithmetic; bucket can hold e.g. 0.3 tokens (not enough for a request) |
| Clock monotonicity | Uses `time.monotonic()` — immune to wall-clock adjustments |
| Process restart | All buckets are lost; all visitors get fresh burst budget — acceptable |

### 10.3 Concurrency Limiter Edge Cases

| Case | Behaviour |
|------|-----------|
| All slots occupied | Immediate 503; no queuing |
| Request handler raises exception | `finally` block releases the semaphore — no slot leak |
| Slow LLM response | Slot held for the duration; other requests may be rejected |
| Non-chat endpoints | Exempt from concurrency limiting (pass-through) |

### 10.4 Input Validation Edge Cases

| Case | Behaviour |
|------|-----------|
| Exactly 1000 characters | Accepted (≤ limit) |
| 1001 characters | Rejected with 422 |
| Empty message string | Accepted by length validator; may be caught by other validation |
| Unicode characters | Length measured in Python `len()` (code points), not bytes |
| Missing `message` field | Pydantic returns 422 for missing required field |
| Extra fields in body | Ignored by Pydantic (no `extra = "forbid"`) |

### 10.5 Interaction Edge Cases

| Case | Behaviour |
|------|-----------|
| Rate-limited request | Rate limiter returns 429 before concurrency limiter runs — no slot consumed |
| Concurrent + rate-limited | A request that passes rate limit but hits concurrency limit gets 503 |
| Multiple error conditions | First middleware to reject wins; later checks are skipped |

---

## 11. Test Plan for This Subsystem

### 11.1 Test Files

| File | Scope |
|------|-------|
| `backend/tests/test_rate_limiter.py` | Token bucket unit tests |
| `backend/tests/test_concurrency.py` | Semaphore unit tests |
| `backend/tests/test_chat.py` | Integration tests for rate limit + concurrency + validation |

### 11.2 Token Bucket Tests (`test_rate_limiter.py`)

| Test | Description | Assertion |
|------|-------------|-----------|
| `test_fresh_bucket_allows_up_to_capacity` | New key gets `capacity` tokens | All requests allowed |
| `test_bucket_exhausted_after_capacity` | Capacity+1 request is denied | `allowed=False`, `retry_after > 0` |
| `test_retry_after_is_positive_when_denied` | Exhausted bucket returns positive wait | `retry_after > 0` |
| `test_different_keys_have_independent_buckets` | Two keys don't share tokens | Key A exhausted, key B allowed |
| `test_tokens_refill_over_time` | After enough time, tokens refill | Request allowed after simulated wait |
| `test_tokens_do_not_exceed_capacity` | Long idle → tokens capped at capacity | `tokens <= capacity` |
| `test_ten_requests_allowed_then_blocked` | Burst=10 scenario: 10 OK, 11th denied | First 10 allowed, 11th blocked |
| `test_retry_after_approximately_one_refill_interval` | With refill=600s, retry ≈ 600s | `500 < retry_after <= 600` |
| `test_client_key_without_proxy` | Direct connection uses `request.client.host` | Key is SHA-256 hash prefix |
| `test_client_key_with_proxy_header` | Trusting proxy reads `X-Forwarded-For` | Key matches first IP in header |
| `test_client_key_with_multiple_forwarded_ips` | Multiple IPs → first one used | Key matches hash of first IP |
| `test_client_key_without_client` | `request.client` is None → `"unknown"` | Key is hash of `"unknown"` |
| `test_client_key_with_empty_forwarded_header` | Empty header → falls back to client host | Key matches client host hash |

### 11.3 Concurrency Limiter Tests (`test_concurrency.py`)

| Test | Description | Assertion |
|------|-------------|-----------|
| `test_semaphore_allows_up_to_max` | Can acquire `max_concurrent` slots | Semaphore locked after max |
| `test_semaphore_releases_correctly` | Release makes slot available | Not locked after release |
| `test_non_blocking_acquire_fails_when_full` | Timeout on full semaphore | `TimeoutError` raised |
| `test_max_attribute_stored` | Constructor stores max value | `mw._max == expected` |

### 11.4 Integration Tests (`test_chat.py`)

| Test | Description | Assertion |
|------|-------------|-----------|
| `test_returns_200_with_reply` | Happy-path chat request | `status=200`, reply present |
| `test_message_exceeds_max_length_returns_422` | Too-long input | `status=422` |
| `test_blocked_message_returns_200_with_refusal` | Policy violation | `status=200`, `blocked=true` |
| `test_rate_limited_after_burst` | Exhaust burst → next request 429 | `status=429`, `Retry-After` header |
| `test_concurrency_limited_returns_503` | All slots occupied → 503 | `status=503`, `Retry-After` header |
| `test_successful_request_increments_counters` | Metrics after success | Counters incremented |
| `test_blocked_request_increments_blocked_counter` | Metrics after block | `blocked_requests` incremented |

### 11.5 Test Environment

- **LLM mocked** via `conftest.py::mock_llm` — returns `"Mocked LLM response."` with fixed token counts.
- **Metrics reset** via `conftest.py::reset_metrics` — zeroes all counters before each test.
- **No real API keys** — tests use the default `"test-key"`.
- **asyncio mode auto** — configured in `pytest.ini`.

### 11.6 Running Tests

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

### 11.7 Coverage Targets

- `app/middleware/rate_limiter.py` — 100% line coverage
- `app/middleware/concurrency.py` — 100% line coverage
- `app/models.py` (input validation) — 100% line coverage
