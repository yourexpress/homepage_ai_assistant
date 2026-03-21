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
| Prompt injection: DAN / do-anything-now | `test_policy_guard.py::test_prompt_injection_do_anything_now` |
| Prompt injection: developer mode | `test_policy_guard.py::test_prompt_injection_enter_developer_mode` |
| Prompt injection: override policy/filter/rules | `test_policy_guard.py::test_prompt_injection_override_safety_policy` |
| Private data: salary | `test_policy_guard.py::test_private_salary` |
| Secrets: API keys | `test_policy_guard.py::test_secret_api_key` |
| Secrets: access tokens | `test_policy_guard.py::test_secret_access_token` |
| Secrets: credentials | `test_policy_guard.py::test_secret_credentials` |
| Secrets: secret keys | `test_policy_guard.py::test_secret_key` |
| Deployment: environment variables | `test_policy_guard.py::test_deployment_environment_variables` |
| Deployment: server info | `test_policy_guard.py::test_deployment_server_running` |
| Deployment: cloud provider | `test_policy_guard.py::test_deployment_cloud_provider` |
| Architecture: database/backend | `test_policy_guard.py::test_architecture_database_backend` |
| Architecture: source code | `test_policy_guard.py::test_architecture_source_code` |
| Architecture: internal config | `test_policy_guard.py::test_architecture_internal_config` |
| No false positives on clean input | `test_policy_guard.py::test_no_false_positive_on_*` |

---

## Test Environment

Tests mock the OpenAI client so no real API key is required:

```python
# conftest.py
@pytest.fixture(autouse=True)
def mock_llm(monkeypatch):
    async def fake_complete(messages):
        return "Mocked LLM response."
    monkeypatch.setattr("app.services.llm_client.complete", fake_complete)
```

---

## Completion Criteria

- All tests pass: `pytest backend/tests/ -v`
- Coverage ≥ 80%: `pytest --cov=app --cov-report=term-missing`
- No test imports production secrets; `.env` is not read in test mode
