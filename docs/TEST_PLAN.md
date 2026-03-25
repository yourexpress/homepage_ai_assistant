# Test Plan: Portfolio AI Assistant

## Philosophy

Tests are written **before** feature implementations. Each test file
documents the expected contract for its component, then drives the
implementation of that component.

> For detailed instructions on running tests, interpreting failures, and
> extending the suite, see [TESTING.md](TESTING.md).

---

## Test Layers

| Layer | Tool | Location |
|-------|------|----------|
| Unit — configuration | pytest | `backend/tests/test_config.py` |
| Unit — schema contracts | pytest | `backend/tests/test_models.py` |
| Unit — policy guard | pytest | `backend/tests/test_policy_guard.py` |
| Unit — rate limiter | pytest | `backend/tests/test_rate_limiter.py` |
| Unit — concurrency limiter | pytest | `backend/tests/test_concurrency.py` |
| Unit — metrics store | pytest | `backend/tests/test_metrics.py` |
| Unit — knowledge base | pytest | `backend/tests/test_knowledge_base.py` |
| Integration — chat endpoint | pytest + httpx | `backend/tests/test_chat.py` |
| Integration — metrics endpoint | pytest + httpx | `backend/tests/test_metrics_api.py` |
| End-to-end — full lifecycle | pytest + httpx | `backend/tests/test_e2e.py` |
| Frontend — smoke tests | Browser JS | `frontend/tests/smoke_tests.html` |

---

## Test Coverage by Requirement

| Requirement | Test(s) |
|-------------|---------|
| Settings load defaults without `.env` | `test_config.py::TestSettingsDefaults::test_settings_instantiates` |
| `origins_list` parses comma-separated values | `test_config.py::TestOriginsListProperty::test_multiple_origins` |
| `ChatRequest` validates message field | `test_models.py::TestChatRequestSchema::test_valid_message_accepted` |
| `ChatRequest` rejects messages over max length | `test_models.py::TestChatRequestSchema::test_message_exceeding_max_length_rejected` |
| `ChatResponse` serialises reply + blocked | `test_models.py::TestChatResponseSchema::test_reply_and_blocked_fields` |
| `MetricsResponse` has all required fields | `test_models.py::TestMetricsResponseSchema::test_all_required_fields_present` |
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
| Chat endpoint returns 503 on concurrency limit | `test_chat.py::test_concurrency_limited_returns_503` |
| Visitor identity: direct connection | `test_rate_limiter.py::test_client_key_without_proxy` |
| Visitor identity: X-Forwarded-For header | `test_rate_limiter.py::test_client_key_with_proxy_header` |
| Visitor identity: multiple IPs in X-Forwarded-For | `test_rate_limiter.py::test_client_key_with_multiple_forwarded_ips` |
| Visitor identity: missing request.client | `test_rate_limiter.py::test_client_key_without_client` |
| Visitor identity: empty X-Forwarded-For | `test_rate_limiter.py::test_client_key_with_empty_forwarded_header` |
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
| Knowledge: JSON files load correctly | `test_knowledge_base.py::TestLoadJson::test_loads_valid_*` |
| Knowledge: missing file graceful fallback | `test_knowledge_base.py::TestLoadJson::test_missing_file_returns_empty_dict` |
| Knowledge: invalid JSON graceful fallback | `test_knowledge_base.py::TestLoadJson::test_invalid_json_returns_empty_dict` |
| Knowledge: all source files loaded | `test_knowledge_base.py::TestLoadAll::test_returns_all_source_files` |
| Knowledge: profile schema valid | `test_knowledge_base.py::TestKnowledgeSchemas::test_profile_has_required_fields` |
| Knowledge: experience schema valid | `test_knowledge_base.py::TestKnowledgeSchemas::test_experience_positions_have_required_fields` |
| Knowledge: projects schema valid | `test_knowledge_base.py::TestKnowledgeSchemas::test_projects_entries_have_required_fields` |
| Knowledge: FAQ schema valid | `test_knowledge_base.py::TestKnowledgeSchemas::test_faq_entries_have_question_and_answer` |
| Knowledge: context contains source citations | `test_knowledge_base.py::TestBuildContext::test_contains_source_citations` |
| Knowledge: context contains key facts | `test_knowledge_base.py::TestBuildContext::test_contains_key_facts` |
| Knowledge: grounding instructions present | `test_knowledge_base.py::TestGroundingConstraints::test_context_instructs_only_approved_info` |
| Knowledge: no private data in files | `test_knowledge_base.py::TestGroundingConstraints::test_no_private_data_in_knowledge_files` |
| Knowledge: context caching works | `test_knowledge_base.py::TestGetContext::test_returns_cached_context` |
| Knowledge: reload rebuilds context | `test_knowledge_base.py::TestGetContext::test_reload_rebuilds_context` |

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

---

## CI Test Stages

Tests run in order from fastest/most-isolated to slowest/most-integrated:

| Stage | Tests | Purpose | Duration |
|-------|-------|---------|----------|
| 1. Unit | `test_config.py`, `test_models.py`, `test_metrics.py`, `test_policy_guard.py`, `test_rate_limiter.py`, `test_concurrency.py`, `test_knowledge_base.py` | Verify individual modules | ~1 s |
| 2. Integration | `test_chat.py`, `test_metrics_api.py` | Verify composed modules with HTTP | ~2 s |
| 3. End-to-end | `test_e2e.py` | Verify full request lifecycle | ~1 s |
| 4. Coverage | All files | Enforce ≥ 80% coverage threshold | ~3 s |
| 5. Frontend | `frontend/tests/smoke_tests.html` | Manual / browser-based DOM checks | Manual |

---

## Test Utilities and Data

| Resource | Location | Purpose |
|----------|----------|---------|
| `helpers.py` | `backend/tests/helpers.py` | Factory functions, assertion helpers, test constants |
| `test_data/` | `backend/tests/test_data/` | Static JSON fixtures for requests, responses, policy samples |
| `conftest.py` | `backend/tests/conftest.py` | Shared fixtures: mock LLM, HTTP client, metrics reset |
