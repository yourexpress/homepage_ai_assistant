# Test Plan: Portfolio AI Assistant

## Philosophy

Tests are written **before** feature implementations. Each test file
documents the expected contract for its component, then drives the
implementation of that component.

---

## Test Layers

| Layer | Tool | Location |
|-------|------|----------|
| Unit — policy guard | pytest | `backend/tests/test_policy_guard.py` |
| Unit — rate limiter | pytest | `backend/tests/test_rate_limiter.py` |
| Unit — concurrency limiter | pytest | `backend/tests/test_concurrency.py` |
| Unit — metrics store | pytest | `backend/tests/test_metrics.py` |
| Unit — LLM client factory | pytest | `backend/tests/test_llm_client.py` |
| Integration — chat endpoint | pytest + httpx | `backend/tests/test_chat.py` |
| Integration — metrics endpoint | pytest + httpx | `backend/tests/test_metrics_api.py` |

---

## Test Coverage by Requirement

| Requirement | Test(s) |
|-------------|---------|
| Input length limit (max 1 000 chars) | `test_chat.py::test_message_exceeds_max_length_returns_422` |
| Rate limit burst (10/10 min) | `test_rate_limiter.py::test_burst_allowed`, `test_burst_exhausted` |
| Rate limit degraded (1/10 min after burst) | `test_rate_limiter.py::test_degraded_rate` |
| Concurrency limit | `test_concurrency.py::test_limit_exceeded` |
| Policy pre-filter rejects violating input | `test_policy_guard.py::test_disallowed_patterns` |
| Policy pre-filter passes clean input | `test_policy_guard.py::test_allowed_input` |
| System prompt injected correctly | `test_policy_guard.py::test_system_prompt_present` |
| Metrics counters increment on request | `test_metrics.py` |
| Metrics endpoint returns valid JSON | `test_metrics_api.py` |
| Chat endpoint happy path | `test_chat.py::test_happy_path` |
| Chat endpoint returns refusal on policy violation | `test_chat.py::test_policy_violation` |
| Chat endpoint returns 429 on rate limit | `test_chat.py::test_rate_limited` |
| Chat endpoint returns 503 on concurrency limit | `test_chat.py::test_concurrency_exceeded` |
| LLM client uses only `api_key` when `OPENAI_BASE_URL` is empty | `test_llm_client.py::TestGetClient::test_creates_client_with_api_key_only_when_base_url_empty` |
| LLM client passes `base_url` when `OPENAI_BASE_URL` is set | `test_llm_client.py::TestGetClient::test_creates_client_with_base_url_when_configured` |
| `base_url` kwarg absent from constructor when `OPENAI_BASE_URL` is empty | `test_llm_client.py::TestGetClient::test_base_url_kwarg_absent_when_empty` |
| LLM client is a singleton (constructed once) | `test_llm_client.py::TestGetClient::test_returns_singleton` |

---

## Test Environment

Tests mock the OpenAI client so no real API key is required:

```python
# conftest.py
@pytest.fixture()
def mock_llm(monkeypatch):
    fake_response = MagicMock()
    fake_response.text = "Mocked LLM response."
    fake_response.prompt_tokens = 10
    fake_response.completion_tokens = 20
    async_complete = AsyncMock(return_value=fake_response)
    monkeypatch.setattr(llm_client, "complete", async_complete)
    return async_complete
```

---

## Completion Criteria

- All tests pass: `pytest backend/tests/ -v`
- Coverage ≥ 80%: `pytest --cov=app --cov-report=term-missing`
- No test imports production secrets; `.env` is not read in test mode
