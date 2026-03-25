# Codebase Guide

A practical guide for navigating, understanding, and modifying the Portfolio AI Assistant.

---

## 1. Mental Model

This system is a **controlled chatbot** — a static frontend talks to a FastAPI backend that wraps an LLM (OpenAI). Every request passes through a pipeline of safety checks before the LLM is called. The design prioritises **safety, cost control, and observability** over flexibility.

Think of it as five concentric layers around the LLM:

```
  Visitor → Frontend → CORS → Rate Limiter → Concurrency Limiter
              → Input Validation → Policy Pre-filter
                → LLM (with system prompt) → Response
```

Each layer can reject a request independently. The LLM is the innermost layer and only sees messages that survived every outer check.

**Key invariants:**
- The LLM never sees a message that matched a blocked pattern.
- The system prompt is always prepended; there is no way to bypass it.
- All knowledge comes from JSON files in `backend/knowledge/` — the LLM is grounded exclusively in this data.
- Metrics are recorded at every decision point (request, block, rate-limit, concurrency-reject, LLM call, response).

---

## 2. Request Flow: POST /api/chat

```
Browser (chat.js)
  │  POST { "message": "..." } to BACKEND_URL/api/chat
  ▼
CORSMiddleware                 → rejects if Origin not in ALLOWED_ORIGINS
  │
  ▼
RateLimiterMiddleware          → 429 + Retry-After if token bucket empty
  │                               (only for /api/chat)
  ▼
ConcurrencyLimiterMiddleware   → 503 + Retry-After: 5 if semaphore full
  │                               (only for /api/chat)
  ▼
FastAPI route handler (chat.py)
  │
  ├─ Pydantic validation        → 422 if message > MAX_INPUT_LENGTH or malformed JSON
  │
  ├─ metrics.record_request()
  │
  ├─ policy_guard.is_blocked()  → 200 with blocked=true if regex matches
  │     (checks ~31 regex patterns)
  │
  ├─ policy_guard.build_messages()
  │     (prepends system prompt from knowledge base)
  │
  ├─ metrics.record_llm_request()
  │
  ├─ llm_client.complete()      → 500 if OpenAI call fails
  │     (AsyncOpenAI, model=gpt-4o-mini, temp=0.7, max_tokens=512)
  │
  ├─ metrics.record_response(latency, tokens)
  │
  └─ return ChatResponse { reply, blocked: false }
```

**Middleware execution order matters.** FastAPI registers middleware in reverse — the last `add_middleware()` call runs first on the request. The execution order (outermost to innermost) is:
1. `ConcurrencyLimiterMiddleware` (registered last in `main.py` → executes first on request)
2. `RateLimiterMiddleware` (registered second → executes second)
3. `CORSMiddleware` (registered first → executes last, wraps response headers)

Both rate limiter and concurrency limiter skip non-`/api/chat` paths.

---

## 3. Where Each Concern Lives

### Frontend UI
| File | Purpose |
|------|---------|
| `frontend/index.html` | Chat page — textarea, send button, message window |
| `frontend/metrics.html` | Metrics dashboard — counter cards + latency bars |
| `frontend/js/chat.js` | Sends POST to `/api/chat`, renders messages, handles 429/503/errors |
| `frontend/js/metrics.js` | Polls GET `/api/metrics` every 10s, renders counters + latency chart |
| `frontend/css/style.css` | All styling |

`BACKEND_URL` is hardcoded in both JS files. Change it when deploying to a new domain.

### Backend API
| File | Purpose |
|------|---------|
| `backend/app/main.py` | App factory — wires middleware, mounts routers |
| `backend/app/api/chat.py` | `POST /api/chat` — orchestrates policy check + LLM call |
| `backend/app/api/metrics.py` | `GET /api/metrics` — returns metrics snapshot |
| `backend/app/models.py` | `ChatRequest`, `ChatResponse`, `MetricsResponse` Pydantic schemas |
| `backend/app/config.py` | `Settings` class — all env vars, defaults, and `.env` loading |

### Validation
| Layer | File | What it checks |
|-------|------|---------------|
| Client-side | `frontend/js/chat.js` | `message.length > 1000` before sending |
| Schema | `backend/app/models.py` | `ChatRequest.check_length` Pydantic validator |
| Policy | `backend/app/services/policy_guard.py` | 31 regex patterns in `BLOCKED_PATTERNS` |

### Policy Engine
| File | Purpose |
|------|---------|
| `backend/app/services/policy_guard.py` | Two-layer policy: regex pre-filter + system prompt |

`is_blocked(message)` → runs 31 compiled regexes. If any match, the message never reaches the LLM.
`build_messages(user_message)` → prepends the system prompt (loaded from knowledge base).

The system prompt tells the LLM to stay in character, cite sources, and refuse off-topic requests. This is the second layer of defence — even if a message passes the pre-filter, the LLM instructions constrain its behaviour.

### Rate Limiting
| File | Purpose |
|------|---------|
| `backend/app/middleware/rate_limiter.py` | Token-bucket per client IP |

**Algorithm:** Each IP gets a bucket with `capacity` tokens (default 10). One token consumed per request. Refills at 1 token per `refill_interval` seconds (default 600s = 10 min). Client IP is SHA-256 hashed (first 16 hex chars). Supports `X-Forwarded-For` when `TRUST_PROXY_HEADERS=true`.

**Scope:** Only `/api/chat` — metrics endpoint is not rate-limited.

### Concurrency Limiting
| File | Purpose |
|------|---------|
| `backend/app/middleware/concurrency.py` | `asyncio.Semaphore` guard |

**Algorithm:** Non-blocking check — if semaphore is locked (counter = 0), reject immediately with 503. Otherwise acquire, process, release in `try/finally`.

**Scope:** Only `/api/chat`.

### LLM Adapter
| File | Purpose |
|------|---------|
| `backend/app/services/llm_client.py` | Thin async wrapper around OpenAI API |

Lazy-initialises `AsyncOpenAI` client. Returns `LLMResponse(text, prompt_tokens, completion_tokens)`. Parameters: model from config, temperature 0.7, max_tokens 512.

### Knowledge Sources
| File | Purpose |
|------|---------|
| `backend/app/services/knowledge_base.py` | Loads JSON, renders prompt sections, caches context |
| `backend/knowledge/profile.json` | Name, education, skills, links |
| `backend/knowledge/experience.json` | Work positions |
| `backend/knowledge/projects.json` | Public projects with tech stacks |
| `backend/knowledge/publications.json` | Research publications |
| `backend/knowledge/faq.json` | Pre-approved Q&A pairs |

Context is cached at module import time. Call `knowledge_base.reload()` to refresh without restart. Each section is tagged `[source: filename.json]` for citation traceability.

### Metrics
| File | Purpose |
|------|---------|
| `backend/app/services/metrics_store.py` | Thread-safe in-memory counters + latency buckets |
| `backend/app/api/metrics.py` | Exposes `GET /api/metrics` |

Singleton `metrics` instance. Counters: total_requests, blocked_requests, llm_requests, successful_responses, rate_limited_requests, concurrency_rejected_requests, prompt/completion tokens. Latency buckets: <1s, 1–3s, 3–10s, >10s. **All counters reset on process restart.**

### Tests
| File | Category | Count |
|------|----------|-------|
| `tests/test_config.py` | Configuration | Settings defaults, env loading |
| `tests/test_models.py` | Schema contracts | Pydantic validation |
| `tests/test_policy_guard.py` | Policy enforcement | ~46 tests: blocked patterns, false positives |
| `tests/test_rate_limiter.py` | Rate limiting | ~13 tests: bucket mechanics, IP hashing |
| `tests/test_concurrency.py` | Concurrency | ~4 tests: semaphore behaviour |
| `tests/test_knowledge_base.py` | Knowledge system | ~37 tests: loading, rendering, caching |
| `tests/test_metrics.py` | Metrics store | Counter increments, snapshots |
| `tests/test_metrics_api.py` | Metrics endpoint | HTTP response shape |
| `tests/test_chat.py` | Chat integration | Full endpoint with mocked LLM |
| `tests/test_e2e.py` | End-to-end placeholders | Skipped stubs for future E2E |
| `tests/conftest.py` | Fixtures | `mock_llm`, `client`, `reset_metrics` |
| `tests/helpers.py` | Test utilities | Factories + assertion helpers |
| `tests/test_data/` | Fixtures | JSON samples for chat, policy, responses |

---

## 4. Recommended Reading Order

**First time reading the codebase:**

1. **This file** — you're here.
2. **`backend/app/config.py`** — all tuneable knobs in one place. Read this first to know what dials exist.
3. **`backend/app/models.py`** — the API contract. Three small schemas.
4. **`backend/app/main.py`** — how the app is assembled. 55 lines.
5. **`backend/app/api/chat.py`** — the main handler. Follow the request flow top-to-bottom.
6. **`backend/app/services/policy_guard.py`** — the safety layer. Understand what gets blocked and why.
7. **`backend/app/middleware/rate_limiter.py`** — the token-bucket algorithm.
8. **`backend/app/services/knowledge_base.py`** — how the system prompt is built.
9. **`backend/app/services/llm_client.py`** — the thinnest file. 47 lines.
10. **`backend/tests/test_chat.py`** — see the full system exercised through tests.
11. **`frontend/js/chat.js`** — the client side. 125 lines.

**Estimated time:** ~1 hour for a developer familiar with FastAPI.

---

## 5. Tracing a Single Request End-to-End

Suppose a visitor types "What are Alex's projects?" and clicks Send.

**Frontend (`chat.js`):**
1. Form submit handler trims the input, checks length < 1000.
2. Appends a "user" message bubble to the chat window.
3. Shows "Thinking…" typing indicator, disables form.
4. Sends `POST https://api.yourexpress.dev/api/chat` with `{"message": "What are Alex's projects?"}`.

**Backend middleware chain:**
5. `ConcurrencyLimiterMiddleware.dispatch()` — path is `/api/chat`, semaphore not locked → acquires slot.
6. `RateLimiterMiddleware.dispatch()` — path is `/api/chat`, hashes client IP, calls `_consume()` → bucket has tokens → passes.
7. `CORSMiddleware` — checks `Origin` header against `ALLOWED_ORIGINS` → allows, adds CORS response headers.

**Backend handler (`chat.py`):**
8. FastAPI deserialises JSON body → `ChatRequest(message="What are Alex's projects?")`. Pydantic validator checks length ≤ 1000 → passes.
9. `metrics.record_request()` — total_requests += 1.
10. `policy_guard.is_blocked("What are Alex's projects?")` — runs 31 regex patterns → no match → returns False.
11. `policy_guard.build_messages("What are Alex's projects?")` — loads cached system prompt from knowledge base, returns `[{role: "system", content: "..."}, {role: "user", content: "What are Alex's projects?"}]`.
12. `metrics.record_llm_request()` — llm_requests += 1.
13. `llm_client.complete(messages)` — calls OpenAI API → returns `LLMResponse(text="Alex's projects include...", prompt_tokens=850, completion_tokens=120)`.
14. `metrics.record_response(latency=1.2, prompt_tokens=850, completion_tokens=120)` — successful_responses += 1, latency bucket "1s_to_3s" += 1.
15. Returns `ChatResponse(reply="Alex's projects include...", blocked=False)`.

**Frontend response:**
16. Removes typing indicator.
17. Appends "assistant" message bubble with the reply text.
18. Re-enables form, focuses input.

**If the visitor then opens `metrics.html`:**
19. `metrics.js` fetches `GET /api/metrics` → sees `total_requests: 1, llm_requests: 1, successful_responses: 1`.

---

## 6. Common Extension Points

### Adding a new knowledge source file
1. Create `backend/knowledge/new_topic.json` with the data.
2. Add `"new_topic.json"` to `_SOURCE_FILES` in `knowledge_base.py`.
3. Write a `_render_new_topic()` function.
4. Add it to `_SECTION_RENDERERS`.
5. Add tests in `test_knowledge_base.py`.

### Adding a new blocked pattern
1. Add a `re.compile(...)` entry to `BLOCKED_PATTERNS` in `policy_guard.py`.
2. Add a test in `test_policy_guard.py` that the pattern blocks the intended input.
3. Add a false-positive test that it doesn't block legitimate portfolio questions.

### Adding a new API endpoint
1. Create `backend/app/api/new_endpoint.py` with an `APIRouter`.
2. Include it in `main.py`: `application.include_router(new_endpoint.router, prefix="/api")`.
3. Decide whether rate limiting and concurrency limiting should apply (update middleware path checks if needed).
4. Add a corresponding test file.

### Changing the LLM provider
1. Modify `backend/app/services/llm_client.py` — replace `AsyncOpenAI` with the new SDK.
2. Keep the same `LLMResponse` return type so `chat.py` doesn't change.
3. Update `config.py` with any new env vars.
4. The `mock_llm` fixture in `conftest.py` monkeypatches `llm_client.complete`, so tests continue to work.

### Adding a new frontend page
1. Create the HTML file in `frontend/`.
2. Add a nav link in both `index.html` and `metrics.html`.
3. Create a JS file in `frontend/js/` if it needs backend interaction.

---

## 7. How to Safely Modify the System

### Before changing anything
1. Run the full test suite to confirm green baseline:
   ```bash
   cd backend && pytest tests/ -v --cov=app --cov-report=term-missing
   ```
2. Read the tests for the module you're changing — they are the specification.

### Making changes safely

| Change type | Risk | Approach |
|-------------|------|----------|
| Adding a blocked pattern | Low — false positives | Add pattern + test + false-positive test. Run `test_policy_guard.py`. |
| Modifying rate limit params | Low | Change `.env`, restart. No code change needed. |
| Updating knowledge files | Low | Edit JSON, call `reload()` or restart. Run `test_knowledge_base.py`. |
| Adding an API endpoint | Medium | Create route + tests. Update middleware path checks if needed. |
| Changing the LLM adapter | Medium | Keep `LLMResponse` interface stable. `mock_llm` fixture mocks at the `complete()` level. |
| Modifying middleware logic | High | Middleware order matters. Test with `test_chat.py` integration tests. |
| Changing the config schema | High | Every env var is used somewhere. Search for usages before renaming or removing. |

### Invariants to preserve
- **Never call the LLM with an unfiltered message.** `is_blocked()` must run before `complete()`.
- **Never expose the system prompt to the user.** The `build_messages()` output is for the LLM, not the response.
- **Metrics must be recorded at every decision point.** If you add a new rejection path, call the appropriate `metrics.record_*()` method.
- **Tests must not make real LLM calls.** Always use or extend the `mock_llm` fixture.
- **The `_consume()` function in rate_limiter must remain synchronous** — it runs between `locked()` check and `acquire()` in the concurrency middleware. An `await` here would break atomicity.
