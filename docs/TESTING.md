# Testing Guide: Portfolio AI Assistant

> Everything you need to run, understand, extend, and debug the test suite.

---

## Table of Contents

1. [How to Run Tests](#1-how-to-run-tests)
2. [Test Folder Structure](#2-test-folder-structure)
3. [Test Categories Explained](#3-test-categories-explained)
4. [Purpose of Each Test File](#4-purpose-of-each-test-file)
5. [Fixtures and Mocks Strategy](#5-fixtures-and-mocks-strategy)
6. [Test Utilities Module](#6-test-utilities-module)
7. [Test Data Folder](#7-test-data-folder)
8. [CI Test Stages](#8-ci-test-stages)
9. [How to Interpret Failures](#9-how-to-interpret-failures)
10. [Test Execution Order](#10-test-execution-order)
11. [How to Safely Extend the Test Suite](#11-how-to-safely-extend-the-test-suite)

---

## 1. How to Run Tests

### Backend Tests (Python / pytest)

```bash
# Install dependencies (once)
cd backend
pip install -r requirements-dev.txt

# Run all tests with coverage
pytest tests/ -v --cov=app --cov-report=term-missing

# Run a specific test file
pytest tests/test_policy_guard.py -v

# Run a specific test class
pytest tests/test_rate_limiter.py::TestBucketMechanics -v

# Run a specific test
pytest tests/test_chat.py::TestChatHappyPath::test_returns_200_with_reply -v

# Run tests matching a keyword
pytest tests/ -k "policy" -v

# Run with parallel execution (if pytest-xdist is installed)
pytest tests/ -n auto -v
```

### Frontend Smoke Tests (Browser)

```bash
# No installation required — open in a browser:
open frontend/tests/smoke_tests.html
# or
python -m http.server 8080 --directory frontend
# Then visit http://localhost:8080/tests/smoke_tests.html
```

### Quick Check (All Green?)

```bash
cd backend && pytest tests/ -q
```

A passing run looks like:

```
237 passed, 4 skipped in 5.16s
```

---

## 2. Test Folder Structure

```
backend/
├── tests/
│   ├── __init__.py               ← Package marker
│   ├── conftest.py               ← Shared fixtures (mock LLM, HTTP client, metrics reset)
│   ├── helpers.py                ← Reusable test utilities (factories, assertions)
│   ├── test_data/                ← Static test data fixtures
│   │   ├── README.md             ← Describes each data file
│   │   ├── chat_requests.json    ← Sample request payloads
│   │   ├── expected_responses.json ← Expected response shapes
│   │   └── policy_samples.json   ← Policy guard sample inputs (safe + blocked)
│   ├── test_config.py            ← Settings defaults and parsing
│   ├── test_models.py            ← API schema contract tests
│   ├── test_knowledge_base.py    ← Knowledge loader, rendering, grounding
│   ├── test_policy_guard.py      ← Policy pre-filter and system prompt
│   ├── test_rate_limiter.py      ← Token-bucket rate limiting
│   ├── test_concurrency.py       ← Semaphore concurrency limiting
│   ├── test_metrics.py           ← In-memory metrics store
│   ├── test_metrics_api.py       ← GET /api/metrics endpoint
│   ├── test_chat.py              ← POST /api/chat endpoint (integration)
│   └── test_e2e.py               ← End-to-end test placeholders
└── pytest.ini                    ← asyncio_mode = auto

frontend/
└── tests/
    ├── README.md                 ← Frontend test instructions
    ├── smoke_tests.html          ← Browser-based test runner
    └── smoke_tests.js            ← DOM / A11y / contract assertions
```

---

## 3. Test Categories Explained

### Unit Tests

Test a single module in isolation with no network calls, no file I/O
(except knowledge files), and no cross-module side effects.

| Category | File(s) | What It Validates |
|----------|---------|-------------------|
| **Configuration** | `test_config.py` | Settings defaults, origins parsing, singleton |
| **Schema / Contract** | `test_models.py` | Pydantic model validation, serialisation, field presence |
| **Policy enforcement** | `test_policy_guard.py` | Regex pre-filter (46 patterns), system prompt structure |
| **Rate limiting** | `test_rate_limiter.py` | Token-bucket mechanics, burst, refill, client key hashing |
| **Concurrency control** | `test_concurrency.py` | Semaphore capacity, release, immediate rejection |
| **Metrics store** | `test_metrics.py` | Counter increments, latency buckets, snapshot isolation |
| **Knowledge base** | `test_knowledge_base.py` | JSON loading, schema validation, rendering, grounding |

### Integration Tests

Test multiple modules composed together, including middleware and routing.

| Category | File(s) | What It Validates |
|----------|---------|-------------------|
| **Chat endpoint** | `test_chat.py` | Full request lifecycle: validation → policy → LLM → response |
| **Metrics endpoint** | `test_metrics_api.py` | JSON shape, field presence, counter reflection |

### End-to-End Tests

Test the entire system as a user would experience it.

| Category | File(s) | What It Validates |
|----------|---------|-------------------|
| **E2E placeholders** | `test_e2e.py` | Full lifecycle with helpers; CORS (TODO); cascade (TODO) |
| **Frontend smoke** | `frontend/tests/` | DOM structure, A11y attributes, JS contracts |

---

## 4. Purpose of Each Test File

| File | Module Under Test | Tests | Purpose |
|------|-------------------|-------|---------|
| `test_config.py` | `app/config.py` | 14 | Defaults load without `.env`; `origins_list` parses correctly; `app_version` default |
| `test_models.py` | `app/models.py` | 15 | `ChatRequest` validation, `ChatResponse` serialisation, `MetricsResponse` shape, health models |
| `test_knowledge_base.py` | `app/services/knowledge_base.py` | 37 | JSON loading (happy + error), schema validation, rendering, context assembly, caching |
| `test_policy_guard.py` | `app/services/policy_guard.py` | 46 | 30 blocked patterns, false-positive checks, `build_messages()` structure |
| `test_rate_limiter.py` | `app/middleware/rate_limiter.py` | 13 | Bucket capacity, exhaustion, retry-after, per-IP isolation, refill, client key |
| `test_concurrency.py` | `app/middleware/concurrency.py` | 4 | Semaphore acquire/release, full-rejection, max stored |
| `test_metrics.py` | `app/services/metrics_store.py` | 14 | All counters, latency buckets, token accumulation, snapshot copy |
| `test_chat.py` | `app/api/chat.py` | 13 | Happy path, validation, policy block, rate limit, concurrency, metrics |
| `test_metrics_api.py` | `app/api/metrics.py` | 6 | 200 status, JSON shape, field types, counter reflection |
| `test_health.py` | `app/api/health.py` | 9 | Liveness 200 + status + version, readiness checks + degraded + exception handling |
| `test_e2e.py` | All modules composed | 7+4 skip | Full lifecycle, policy sweep, input validation, metrics consistency, CORS/cascade TODO |
| `test_corner_cases.py` | All modules composed | 69 | Uncovered code paths, dangerous inputs, policy bypass, latency boundaries, error recovery |
| `helpers.py` | (test support) | — | Factories, assertion helpers, test data constants |

---

## 5. Fixtures and Mocks Strategy

All shared fixtures live in `conftest.py`.  The strategy is:

### Always Mock

| Dependency | Why | How |
|------------|-----|-----|
| **OpenAI API** (`llm_client.complete`) | Avoids real API costs, latency, and flakiness | `AsyncMock` in `conftest.py::mock_llm` |
| **Time** (`time.monotonic`) | Tests token refill and latency buckets without real waits | `monkeypatch` / direct bucket manipulation |

### Always Real

| Component | Why |
|-----------|-----|
| **Knowledge JSON files** | Tests must verify actual production data files |
| **Policy guard regex patterns** | Tests must verify actual `BLOCKED_PATTERNS` list |
| **Pydantic models** | Tests must verify actual validation rules |
| **FastAPI app** (via `ASGITransport`) | Integration tests exercise real middleware stack |
| **Token bucket algorithm** | Unit tests verify actual math |
| **Asyncio semaphore** | Tests verify real async concurrency |
| **Metrics store** | Tests verify real counter behaviour |

### Fixture Dependency Chain

```
mock_llm (monkeypatch)      reset_metrics
        │                        │
        └─────── client ─────────┘
                   │
          Uses ASGITransport + fresh create_app()
```

### How to Add a New Fixture

1. Add it to `conftest.py` if it's used across multiple test files.
2. Add it to the specific test file if it's only used there.
3. Use `pytest.fixture()` (not `autouse`) — make dependencies explicit.
4. Name it descriptively: `mock_llm`, `reset_metrics`, `store` (for MetricsStore).

---

## 6. Test Utilities Module

`tests/helpers.py` provides:

| Helper | Purpose |
|--------|---------|
| `make_chat_request_body(message)` | Factory for JSON request payloads |
| `make_mock_llm_response(text, tokens)` | Factory for mock LLMResponse objects |
| `assert_json_response(response, status)` | Assert status code and parse JSON |
| `assert_chat_reply(response, blocked)` | Assert valid ChatResponse shape |
| `assert_metrics_snapshot(data)` | Assert all MetricsResponse fields present |
| `SAFE_MESSAGES` | List of pre-approved clean test messages |
| `BLOCKED_MESSAGES` | List of known-blocked test messages |

### Usage

```python
from .helpers import assert_chat_reply, make_chat_request_body

async def test_happy_path(self, client):
    body = make_chat_request_body("Tell me about Alex.")
    response = await client.post("/api/chat", json=body)
    assert_chat_reply(response, blocked=False)
```

---

## 7. Test Data Folder

`tests/test_data/` contains static fixtures:

| File | Purpose |
|------|---------|
| `chat_requests.json` | Sample valid, invalid, and policy-violating request bodies |
| `expected_responses.json` | Expected response shapes for assertion |
| `policy_samples.json` | Comprehensive policy guard test inputs (safe + blocked categories) |
| `README.md` | Describes each file and usage rules |

### Rules

- Never commit real API keys or personal data.
- Keep payloads small and deterministic.
- Update data files when `models.py` schemas change.

---

## 8. CI Test Stages

The recommended CI pipeline runs tests in stages, from fastest and most
isolated to slowest and most integrated.  A failure at any stage
short-circuits the remaining stages.

```
Stage 1: Lint & Type Check (fastest)
  ├── ruff check backend/
  ├── mypy backend/app/ (if configured)
  └── ~5 seconds

Stage 2: Unit Tests (fast, isolated)
  ├── pytest tests/test_config.py tests/test_models.py -v
  ├── pytest tests/test_metrics.py -v
  ├── pytest tests/test_policy_guard.py -v
  ├── pytest tests/test_rate_limiter.py -v
  ├── pytest tests/test_concurrency.py -v
  ├── pytest tests/test_knowledge_base.py -v
  └── ~1 second total

Stage 3: Integration Tests (medium, uses app + middleware)
  ├── pytest tests/test_chat.py -v
  ├── pytest tests/test_metrics_api.py -v
  └── ~2 seconds total

Stage 4: End-to-End Tests (slowest, full stack)
  ├── pytest tests/test_e2e.py -v
  └── ~1 second (most are placeholders)

Stage 5: Coverage Report
  ├── pytest tests/ --cov=app --cov-report=term-missing --cov-fail-under=80
  └── Fail if coverage < 80%

Stage 6: Frontend Smoke Tests (manual / browser-based)
  └── Open frontend/tests/smoke_tests.html
```

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements-dev.txt

      - name: Unit tests
        run: |
          cd backend
          pytest tests/test_config.py tests/test_models.py tests/test_metrics.py \
                 tests/test_policy_guard.py tests/test_rate_limiter.py \
                 tests/test_concurrency.py tests/test_knowledge_base.py -v

      - name: Integration tests
        run: |
          cd backend
          pytest tests/test_chat.py tests/test_metrics_api.py -v

      - name: E2E tests
        run: |
          cd backend
          pytest tests/test_e2e.py -v

      - name: Coverage
        run: |
          cd backend
          pytest tests/ --cov=app --cov-report=term-missing --cov-fail-under=80
```

---

## 9. How to Interpret Failures

### Common Failure Patterns

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `test_policy_guard.py` test fails on a new blocked pattern | Pattern missing from `BLOCKED_PATTERNS` in `policy_guard.py` | Add the regex to the list |
| `test_policy_guard.py` false-positive test fails | Pattern is too broad — matches a safe question | Narrow the regex with word boundaries `\b` |
| `test_rate_limiter.py` timing-related failure | Flaky due to `time.monotonic()` — rare | Re-run; if persistent, check `_consume()` logic |
| `test_chat.py` integration test returns wrong status | Middleware ordering changed in `main.py` | Check `create_app()` middleware registration order |
| `test_models.py` validation error test fails | `MAX_INPUT_LENGTH` changed in `config.py` | Update test to match new limit |
| `test_knowledge_base.py` schema test fails | Knowledge JSON file changed structure | Update JSON or test to match |
| `test_metrics.py` counter test fails | `MetricsStore` method name changed | Update test to use new method name |
| `test_e2e.py` lifecycle test fails | State leak from prior test | Ensure `reset_metrics` fixture is applied |
| `ImportError` in any test | Missing dependency or wrong working directory | Run `pip install -r requirements-dev.txt` from `backend/` |
| `RuntimeError: no running event loop` | `asyncio_mode` not set | Ensure `pytest.ini` has `asyncio_mode = auto` |

### Debugging Steps

```bash
# 1. Run failing test in isolation with output:
pytest tests/test_xxx.py::TestClass::test_name -v -s

# 2. Show fixture setup chain:
pytest tests/test_xxx.py --setup-show

# 3. Enable debug logging:
pytest tests/test_xxx.py -v -s --log-cli-level=DEBUG

# 4. Check coverage for specific module:
pytest tests/test_xxx.py --cov=app.services.xxx --cov-report=term-missing

# 5. Verify imports work:
python -c "from app.services.knowledge_base import load_all; print(load_all().keys())"
```

---

## 10. Test Execution Order

Tests should pass in this order, from most foundational to most composed.
If a lower-level test fails, higher-level tests are unreliable.

```
1. test_config.py          ← Configuration loads correctly
2. test_models.py          ← API contract is valid
3. test_knowledge_base.py  ← Knowledge system works
4. test_policy_guard.py    ← Policy engine works
5. test_metrics.py         ← Metrics accumulator works
6. test_rate_limiter.py    ← Rate limiting works
7. test_concurrency.py     ← Concurrency limiting works
8. test_chat.py            ← Chat endpoint works (depends on 1-7)
9. test_metrics_api.py     ← Metrics endpoint works (depends on 5)
10. test_e2e.py            ← Full lifecycle works (depends on all above)
```

### Why This Order Matters

- If `test_config.py` fails, nothing else can work.
- If `test_policy_guard.py` fails, `test_chat.py` policy tests are meaningless.
- If `test_rate_limiter.py` fails, `test_chat.py` rate-limit tests are meaningless.
- `test_e2e.py` is the final confirmation that all pieces compose correctly.

---

## 11. How to Safely Extend the Test Suite

### Adding a New Unit Test

1. **Identify the module** under test (e.g. `app/services/new_module.py`).
2. **Create** `backend/tests/test_new_module.py`.
3. **Write docstring** explaining what the file covers, inputs/outputs, failure modes.
4. **Write tests first** (red) — then implement the module (green).
5. **Use existing fixtures** from `conftest.py` where possible.
6. **Add assertion helpers** to `helpers.py` if the pattern repeats.
7. **Update** this doc and `docs/TEST_PLAN.md` with the new file.

### Adding a New Integration Test

1. **Use the `client` fixture** — it provides a fresh app with mocked LLM.
2. **Reset metrics** — use the `reset_metrics` fixture to avoid counter pollution.
3. **Check status codes** and **response shapes** (use `helpers.py`).
4. **Do not modify global state** (e.g. `settings`) without restoring it in a `finally`.

### Adding a New Policy Pattern Test

1. Add the expected-blocked input to `test_policy_guard.py::TestIsBlocked`.
2. Add a false-positive check to ensure the pattern doesn't block clean questions.
3. Add the pattern to `policy_samples.json` in `test_data/`.
4. Run `pytest tests/test_policy_guard.py -v` to verify.

### Adding a New E2E Test

1. Add to `test_e2e.py` in the appropriate class.
2. Use `pytest.mark.skip(reason="TODO: ...")` if the test needs infrastructure not yet available.
3. Use helpers from `helpers.py` for assertions.

### Adding a Frontend Test

1. Add `assert()` or `skip()` calls in `frontend/tests/smoke_tests.js`.
2. Keep tests side-effect-free — no form submissions or network calls.
3. Test DOM structure, attributes, and static content only.

### Checklist Before Merging New Tests

- [ ] New test file has a module-level docstring explaining purpose.
- [ ] Tests run in isolation: `pytest tests/test_new.py -v`.
- [ ] Tests run with the full suite: `pytest tests/ -v`.
- [ ] No regressions: existing test count unchanged or increased.
- [ ] Coverage does not decrease: `pytest tests/ --cov=app --cov-fail-under=80`.
- [ ] `TESTING.md` and `TEST_PLAN.md` updated if new test file added.
- [ ] Test data in `test_data/` updated if new schemas or patterns added.
