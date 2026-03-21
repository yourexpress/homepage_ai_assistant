# Troubleshooting Guide

Use this guide to quickly locate and fix the most common failure modes.

---

## Backend Fails to Start

### `KeyError: OPENAI_API_KEY` or validation error on startup

**Cause:** Required environment variable is missing.  
**Fix:**
```bash
cp backend/.env.example backend/.env
# edit .env and set OPENAI_API_KEY
```

### `ModuleNotFoundError`

**Cause:** Dependencies not installed.  
**Fix:**
```bash
cd backend
pip install -r requirements.txt
```

### Port already in use

**Cause:** Another process on port 8000.  
**Fix:**
```bash
lsof -ti:8000 | xargs kill -9
uvicorn app.main:app --reload --port 8000
```

---

## Chat Returns 400 Bad Request

**Cause:** The policy pre-filter blocked the message.  
**Symptoms:** Response body contains `"error": "Request blocked by content policy"`.  
**Fix for end-users:** Rephrase the question to focus on public portfolio topics.  
**Fix for developers:** Review `BLOCKED_PATTERNS` in
`backend/app/services/policy_guard.py` and adjust the regex list.

---

## Chat Returns 422 Unprocessable Entity

**Cause:** The message exceeded `MAX_INPUT_LENGTH` characters, or the JSON body
is malformed.  
**Fix:** Shorten the input, or check the request body format matches the
`ChatRequest` schema in `backend/app/models.py`.

---

## Chat Returns 429 Too Many Requests

**Cause:** The client IP has exhausted its rate-limit token bucket.  
**Symptoms:** Response body contains `"error": "Rate limit exceeded"`.  
**Fix for end-users:** Wait before retrying. The response includes a
`Retry-After` header (seconds).  
**Fix for developers:** Adjust `RATE_LIMIT_BURST` and
`RATE_LIMIT_REFILL_INTERVAL` in `.env`.

---

## Chat Returns 503 Service Unavailable

**Cause:** Too many concurrent requests are in flight (semaphore full).  
**Fix for end-users:** Retry in a few seconds.  
**Fix for developers:** Increase `MAX_CONCURRENT_REQUESTS` in `.env`, or scale
the backend horizontally.

---

## Chat Returns 500 Internal Server Error

**Cause:** Unhandled exception, most likely an LLM API error.  
**Symptoms:** Backend logs show an OpenAI API exception.  
**Steps:**
1. Check backend logs for the full traceback.
2. Verify `OPENAI_API_KEY` is valid and has quota.
3. Check [OpenAI status page](https://status.openai.com/).
4. If the error is transient (timeout, 502), the client should retry with
   exponential back-off.

---

## Frontend Chat Box Does Nothing

**Symptoms:** Clicking "Send" shows no response and no network request.

**Steps:**
1. Open browser DevTools → Console. Look for JavaScript errors.
2. Open DevTools → Network. Check whether a POST to `/api/chat` was attempted.
3. If no request: check `BACKEND_URL` constant in `frontend/js/chat.js`
   matches your deployed backend URL.
4. If request shows CORS error: add the frontend origin to `ALLOWED_ORIGINS`
   in the backend `.env`.

---

## Metrics Page Shows Zeros or Stale Data

**Symptoms:** `metrics.html` shows all counters at 0 or doesn't refresh.

**Steps:**
1. Verify the backend is running and `/api/metrics` returns JSON:
   ```bash
   curl http://localhost:8000/api/metrics
   ```
2. Check `BACKEND_URL` in `frontend/js/metrics.js`.
3. Metrics reset on each backend restart (in-memory store). This is expected
   for the portfolio/demo deployment.

---

## Tests Fail

### `httpx` not found

```bash
pip install -r backend/requirements-dev.txt
```

### Tests make real API calls

Check `backend/tests/conftest.py` — the `mock_llm` fixture should be
`autouse=True`. If a test file bypasses it, it should mock the LLM client
explicitly.

### `RuntimeError: no running event loop`

Ensure the test session uses `pytest-asyncio` in auto mode:
```ini
# backend/pyproject.toml or pytest.ini
[pytest]
asyncio_mode = auto
```

---

## Rate Limiter Not Working as Expected

The rate limiter is IP-based. Behind a reverse proxy, all requests may appear
to come from the proxy IP. Fix by configuring the proxy to forward the
`X-Forwarded-For` header and setting `TRUST_PROXY_HEADERS=true` in `.env`.

The current implementation stores state in-memory. In a multi-instance
deployment, each instance maintains its own bucket, so the effective limit is
multiplied by the number of instances. Replace `RateLimiterMiddleware` with a
Redis-backed implementation for multi-instance correctness.

---

## Locating Log Lines

All structured log lines are emitted with a `component` field:

| Component | Source file |
|-----------|-------------|
| `rate_limiter` | `app/middleware/rate_limiter.py` |
| `concurrency` | `app/middleware/concurrency.py` |
| `policy_guard` | `app/services/policy_guard.py` |
| `llm_client` | `app/services/llm_client.py` |
| `chat` | `app/api/chat.py` |
| `metrics` | `app/api/metrics.py` |
