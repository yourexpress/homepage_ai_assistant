# Portfolio AI Assistant

A production-minded portfolio project: an AI-powered chat assistant that lets
public visitors learn about the owner's background, research, and projects.
The static frontend is hosted on **GitHub Pages**; the backend API runs on a
separate cloud platform.

---

## Features

| Capability | Details |
|---|---|
| 🤖 Portfolio chat | Controlled LLM answers only from public portfolio context |
| 🛡️ Content policy | Pre-filter + system prompt blocks private/unsafe requests |
| ⏱️ Rate limiting | 10 requests / 10 min burst → 1 request / 10 min degraded |
| 🔒 Concurrency limit | Configurable max in-flight requests (default: 10) |
| 📏 Input validation | Per-message character limit (default: 1 000 chars) |
| 📊 Metrics page | Public-facing throughput, latency, and token counters |
| 🧪 Test-first | Tests written before implementation; 70 tests, all green |

---

## Repository Structure

```
homepage_ai_assistant/
├── README.md
├── docs/
│   ├── SYSTEM_DESIGN.md      ← architecture & design decisions
│   ├── TEST_PLAN.md          ← test strategy
│   ├── READING_GUIDE.md      ← how to navigate this codebase
│   └── TROUBLESHOOTING.md    ← common failure modes + fixes
├── frontend/                 ← GitHub Pages static site
│   ├── index.html            ← chat UI
│   ├── metrics.html          ← metrics dashboard
│   ├── css/style.css
│   └── js/
│       ├── chat.js
│       └── metrics.js
└── backend/                  ← FastAPI service
    ├── requirements.txt
    ├── requirements-dev.txt
    ├── .env.example
    ├── Dockerfile
    ├── pytest.ini
    ├── app/
    │   ├── main.py           ← app factory & middleware wiring
    │   ├── config.py         ← all settings (reads .env)
    │   ├── models.py         ← Pydantic request/response schemas
    │   ├── api/
    │   │   ├── chat.py       ← POST /api/chat
    │   │   └── metrics.py    ← GET /api/metrics
    │   ├── middleware/
    │   │   ├── rate_limiter.py
    │   │   └── concurrency.py
    │   └── services/
    │       ├── policy_guard.py
    │       ├── llm_client.py
    │       └── metrics_store.py
    └── tests/
        ├── conftest.py
        ├── test_policy_guard.py
        ├── test_rate_limiter.py
        ├── test_concurrency.py
        ├── test_metrics.py
        ├── test_chat.py
        ├── test_metrics_api.py
        └── test_llm_client.py
```

---

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env          # fill in OPENAI_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v --cov=app --cov-report=term-missing
```

### Frontend

Open `frontend/index.html` in a browser, or push the `frontend/` directory to
GitHub Pages. Update the `BACKEND_URL` constant in `frontend/js/chat.js` and
`frontend/js/metrics.js` to point at your deployed backend.

---

## Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | GitHub Pages | Configure Pages source to `/ (root)` or `/frontend` |
| Backend | Render / Fly.io / Railway | Deploy from `backend/Dockerfile` |
| LLM | Any OpenAI-compatible provider | Set `OPENAI_API_KEY`; optionally `OPENAI_BASE_URL` for non-OpenAI providers |

---

## Configuration Reference

All backend settings are in `backend/app/config.py` and read from `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Required. API key for the LLM provider |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name passed to the provider |
| `OPENAI_BASE_URL` | _(empty — OpenAI default)_ | Base URL for any OpenAI-compatible provider (e.g. Gemini, Groq, Ollama) |
| `ALLOWED_ORIGINS` | `https://yourexpress.github.io` | CORS allow-list (comma-separated) |
| `MAX_INPUT_LENGTH` | `1000` | Max chars per user message |
| `MAX_CONCURRENT_REQUESTS` | `10` | Semaphore capacity |
| `RATE_LIMIT_BURST` | `10` | Token bucket burst size |
| `RATE_LIMIT_REFILL_INTERVAL` | `600` | Seconds per token refill (600 s = 10 min) |
| `TRUST_PROXY_HEADERS` | `false` | Set `true` behind a reverse proxy |

---

## Documentation

- 📐 [System Design](docs/SYSTEM_DESIGN.md)
- 🧪 [Test Plan](docs/TEST_PLAN.md)
- 📖 [Developer Reading Guide](docs/READING_GUIDE.md)
- 🔧 [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
