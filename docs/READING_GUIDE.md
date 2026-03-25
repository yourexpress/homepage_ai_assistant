# Developer Reading Guide

Welcome to the **Portfolio AI Assistant** codebase. This guide helps you
navigate the repo quickly, understand the dependency order, and locate the
right file when something goes wrong.

---

## Quick Map

```
homepage_ai_assistant/
├── README.md                    ← start here
├── docs/
│   ├── REQUIREMENTS.md          ← engineering requirements (start here for scope)
│   ├── SYSTEM_DESIGN.md         ← architecture, data-flow, design decisions
│   ├── TEST_PLAN.md             ← what is tested and why
│   ├── TESTING.md               ← how to run, extend, and debug tests
│   ├── IMPLEMENTATION_PLAN.md   ← phased dev plan, traceability matrix
│   ├── READING_GUIDE.md         ← this file
│   └── TROUBLESHOOTING.md       ← common failure modes + fixes
├── frontend/                    ← GitHub Pages static site
│   ├── index.html               ← chat UI entry point
│   ├── metrics.html             ← public metrics dashboard
│   ├── css/style.css
│   └── js/
│       ├── chat.js              ← chat request/response logic
│       └── metrics.js           ← metrics polling + rendering
└── backend/                     ← FastAPI service
    ├── requirements.txt
    ├── requirements-dev.txt
    ├── .env.example
    ├── Dockerfile
    ├── app/
    │   ├── main.py              ← app factory + middleware wiring
    │   ├── config.py            ← all settings (reads .env)
    │   ├── models.py            ← Pydantic schemas
    │   ├── api/
    │   │   ├── chat.py          ← POST /api/chat
    │   │   └── metrics.py       ← GET /api/metrics
    │   ├── middleware/
    │   │   ├── rate_limiter.py  ← token-bucket per IP
    │   │   └── concurrency.py  ← asyncio.Semaphore guard
    │   └── services/
    │       ├── policy_guard.py  ← pre-filter + system prompt
    │       ├── llm_client.py    ← OpenAI API wrapper
    │       └── metrics_store.py ← in-memory counters
    └── tests/
        ├── conftest.py
        ├── test_policy_guard.py
        ├── test_rate_limiter.py
        ├── test_concurrency.py
        ├── test_metrics.py
        ├── test_chat.py
        └── test_metrics_api.py
```

---

## Reading Order for New Contributors

1. **`README.md`** — project purpose, quick-start, deployment overview.
2. **`docs/REQUIREMENTS.md`** — engineering requirements, scope, and
   prioritized feature list.
3. **`docs/SYSTEM_DESIGN.md`** — understand the full architecture before
   touching code.
4. **`backend/app/config.py`** — all tuneable knobs in one place.
5. **`backend/app/models.py`** — learn the request/response shapes.
6. **`backend/app/middleware/rate_limiter.py`** — the token-bucket algorithm.
7. **`backend/app/middleware/concurrency.py`** — the semaphore guard.
8. **`backend/app/services/policy_guard.py`** — how inputs are filtered and
   the system prompt is constructed.
9. **`backend/app/services/llm_client.py`** — thin async LLM wrapper.
10. **`backend/app/api/chat.py`** — the main request handler; ties everything
    together.
11. **`backend/tests/`** — read tests alongside each module; they are the
    specification.

---

## Request Lifecycle (POST /api/chat)

```
Client
  │
  ▼
CORS middleware                          → 403 if origin not allowed
  │
  ▼
Input length check (models.py)           → 422 if message > MAX_INPUT_LENGTH
  │
  ▼
Rate limiter middleware                  → 429 if bucket empty
  │
  ▼
Concurrency limiter middleware           → 503 if semaphore full
  │
  ▼
policy_guard.check_input()               → 400 if pre-filter blocks message
  │
  ▼
metrics_store.record_llm_request()
  │
  ▼
llm_client.complete(messages)            → calls OpenAI API
  │
  ▼
metrics_store.record_response(latency)
  │
  ▼
ChatResponse JSON → Client
```

---

## Environment Variables

All configuration lives in `backend/app/config.py`. Copy
`backend/.env.example` to `backend/.env` and fill in values.

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | LLM authentication (required) |
| `OPENAI_MODEL` | Which model to call |
| `ALLOWED_ORIGINS` | CORS allow-list (comma-separated) |
| `MAX_INPUT_LENGTH` | Per-message character limit |
| `MAX_CONCURRENT_REQUESTS` | Semaphore size |
| `RATE_LIMIT_BURST` | Token bucket capacity |
| `RATE_LIMIT_REFILL_INTERVAL` | Seconds between token refills |

---

## Running Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v --cov=app --cov-report=term-missing
```

## Running the Backend Locally

```bash
cd backend
cp .env.example .env          # fill in OPENAI_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Deploying the Frontend

Push to `main`; GitHub Actions deploys `frontend/` to GitHub Pages
automatically (configure Pages source to `/frontend`).
