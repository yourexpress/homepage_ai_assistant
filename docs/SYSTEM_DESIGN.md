# System Design: Portfolio AI Assistant

## Overview

A portfolio AI assistant that allows public visitors to chat with a controlled
LLM-powered system to learn about the owner's public background, research,
projects, and experience. The static frontend is hosted on GitHub Pages; the
backend API and LLM serving run on a separate cloud platform.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  GitHub Pages (Static Frontend)                                      │
│                                                                      │
│   index.html  ──►  chat.js  ──►  POST /api/chat  ───────────────┐  │
│   metrics.html ──► metrics.js ──► GET /api/metrics ──────────┐  │  │
└──────────────────────────────────────────────────────────────│──│──┘
                                                               │  │
                             HTTPS / CORS                      │  │
                                                               │  │
┌──────────────────────────────────────────────────────────────▼──▼──┐
│  Backend API (FastAPI — e.g. Render / Fly.io / Railway)             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Middleware Stack (applied in order)                         │   │
│  │   1. CORS                                                    │   │
│  │   2. Input length guard (max 1 000 chars per message)        │   │
│  │   3. Rate limiter  (10 req/10 min burst → 1 req/10 min)      │   │
│  │   4. Concurrency limiter (max N in-flight requests)          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │  /api/chat   │   │  Policy Guard    │   │  Metrics Store   │   │
│  │  POST        │──►│  (pre-filter +   │   │  (in-memory)     │   │
│  │              │   │   system prompt) │   │                  │   │
│  └──────────────┘   └──────────────────┘   └──────────────────┘   │
│         │                    │                                       │
│         │                    ▼                                       │
│         │           ┌──────────────────┐                           │
│         │           │  LLM Client      │                           │
│         │           │  (OpenAI-compat) │                           │
│         └──────────►└──────────────────┘                           │
│                              │                                       │
│  ┌──────────────┐            │                                      │
│  │  /api/metrics│            ▼                                      │
│  │  GET         │   ┌──────────────────┐                           │
│  └──────────────┘   │  LLM Provider    │                           │
│                      │  (OpenAI API or  │                           │
│                      │   compatible)    │                           │
│                      └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### Frontend (GitHub Pages)

| File | Purpose |
|------|---------|
| `frontend/index.html` | Chat entry point hosted at `yourexpress.github.io` |
| `frontend/metrics.html` | Public-facing operational metrics dashboard |
| `frontend/js/chat.js` | Chat UI logic — sends requests, renders responses |
| `frontend/js/metrics.js` | Polls `/api/metrics` and renders charts |
| `frontend/css/style.css` | Shared styling |

### Backend (FastAPI)

| Module | Purpose |
|--------|---------|
| `app/main.py` | Application factory, CORS, middleware wiring |
| `app/config.py` | Settings via pydantic-settings; reads `.env` |
| `app/models.py` | Pydantic request/response schemas |
| `app/api/chat.py` | `POST /api/chat` handler |
| `app/api/metrics.py` | `GET /api/metrics` handler |
| `app/middleware/rate_limiter.py` | Token-bucket rate limiter per IP |
| `app/middleware/concurrency.py` | Asyncio semaphore concurrency guard |
| `app/services/policy_guard.py` | Pre-filter input; inject system prompt |
| `app/services/llm_client.py` | Thin async wrapper over the OpenAI-compatible Chat Completions API; supports any provider via `OPENAI_BASE_URL` |
| `app/services/metrics_store.py` | Thread-safe in-memory metrics accumulator |

---

## Key Design Decisions

### Rate Limiting Strategy

Each client IP gets a **token bucket** with:
- Capacity: 10 tokens
- Refill rate: 1 token per 600 seconds (= 1 token per 10 minutes)

When the bucket is full a visitor can send up to 10 messages in rapid succession
(the burst allowance). After the bucket is empty, tokens refill at 1 per 600 s —
exactly 1 request per 10 minutes — matching the stated requirement.

Storage: Python `dict` in application memory, keyed by client IP. Suitable for
single-instance deployment; for multi-instance the dict should be replaced with
a Redis store.

### Concurrency Limiting

An `asyncio.Semaphore` limits how many chat requests can be actively awaiting
the LLM at once. The limit is configurable via `MAX_CONCURRENT_REQUESTS` (default 10).
Excess requests receive HTTP 503 immediately rather than queuing indefinitely.

### Input Length Limit

Requests whose `message` field exceeds `MAX_INPUT_LENGTH` (default 1 000 chars)
are rejected with HTTP 422 before any LLM call is made.

### Policy Guard

Two-layer content control:

1. **Pre-filter** (synchronous, cheap): regex / keyword scan rejects messages
   containing known policy-violating patterns (prompt injection attempts,
   requests for private information, etc.).

2. **System prompt** (LLM-layer): the LLM is given a fixed system prompt that:
   - identifies the assistant's role
   - restricts it to only discussing the owner's public portfolio information
   - instructs it to refuse off-topic or private requests politely
   - provides the authoritative public bio/experience text used as context

### Metrics Collection

In-memory counters track:
- Total requests received
- Requests rejected (rate limit / concurrency / policy / input length)
- Requests forwarded to LLM
- Successful responses
- Latency histogram (buckets: 0–1 s, 1–3 s, 3–10 s, >10 s)
- Token usage totals (where available)

Counters reset on process restart. Suitable for portfolio/demo purposes;
production would use Prometheus + Grafana.

---

## Security Considerations

- CORS restricted to allowed origins (configurable; defaults to GitHub Pages URL)
- API key for LLM stored in environment variable, never exposed to frontend
- No PII collected; client IP is hashed before use as rate-limit key
- Input sanitised before inclusion in LLM prompt
- All error responses use generic messages to avoid information leakage

---

## Deployment

```
Frontend:  yourexpress.github.io  (GitHub Pages, served from /frontend)
Backend:   https://api.yourexpress.dev  (configurable via BACKEND_URL)
LLM:       OpenAI API (or any OpenAI-compatible endpoint)
```

Environment variables (backend):

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Required. API key for the LLM provider |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name passed to the provider |
| `OPENAI_BASE_URL` | _(empty — OpenAI default)_ | Base URL for any OpenAI-compatible provider (Gemini, Groq, Anthropic, Ollama, …). Leave empty to use OpenAI. |
| `ALLOWED_ORIGINS` | `https://yourexpress.github.io` | CORS origins |
| `MAX_INPUT_LENGTH` | `1000` | Max chars per message |
| `MAX_CONCURRENT_REQUESTS` | `10` | Semaphore limit |
| `RATE_LIMIT_BURST` | `10` | Token bucket capacity |
| `RATE_LIMIT_REFILL_INTERVAL` | `600` | Seconds per token refill (600 s = 10 min) |
