# Test-First Implementation Plan

> A phased, dependency-aware development plan for the Portfolio AI Assistant.
> Every phase requires its tests and test documentation to exist **before**
> the component implementation begins.

---

## Table of Contents

1. [Phased Development Plan](#1-phased-development-plan)
2. [Dependency-Aware Implementation Order](#2-dependency-aware-implementation-order)
3. [Test Requirements for Each Phase](#3-test-requirements-for-each-phase)
4. [Completion Criteria for Each Phase](#4-completion-criteria-for-each-phase)
5. [Rollback / Debugging Strategy](#5-rollback--debugging-strategy)
6. [Mapping from Requirements to Tests](#6-mapping-from-requirements-to-tests)
7. [Test Categories](#7-test-categories)
8. [Traceability Matrix](#8-traceability-matrix)
9. [Definition of Done for Each Module](#9-definition-of-done-for-each-module)
10. [Mock vs Real Recommendation](#10-mock-vs-real-recommendation)

---

## 1. Phased Development Plan

### Phase 0 — Project Skeleton & Configuration

**Goal:** Establish the project scaffold, dependency files, settings schema,
and CI test runner so that every subsequent phase has a working test harness
from day one.

| Deliverable | Location |
|-------------|----------|
| `backend/app/config.py` | Pydantic Settings model (all env vars) |
| `backend/app/__init__.py` | Package marker |
| `backend/requirements.txt` | Runtime dependencies |
| `backend/requirements-dev.txt` | Test dependencies (pytest, httpx, pytest-asyncio, pytest-cov) |
| `backend/pytest.ini` | asyncio_mode = auto |
| `backend/tests/conftest.py` | Shared fixtures (mock LLM, metrics reset, HTTP client) |
| `.gitignore` | Standard Python ignores |

**Tests written first:**
- Verify `Settings` loads defaults without `.env` file.
- Verify `origins_list` parses comma-separated values.

---

### Phase 1 — Pydantic Models (Request / Response Schemas)

**Goal:** Define and validate the API contract before any endpoint exists.

| Deliverable | Location |
|-------------|----------|
| `backend/app/models.py` | `ChatRequest`, `ChatResponse`, `MetricsResponse` |

**Tests written first (`test_models.py` or inline in `test_chat.py`):**
- `ChatRequest` rejects messages > `MAX_INPUT_LENGTH`.
- `ChatRequest` rejects empty / missing `message` field.
- `ChatResponse` round-trips `reply` + `blocked` fields.
- `MetricsResponse` has all required counter fields.

---

### Phase 2 — Knowledge Base (Structured Data + Loader)

**Goal:** Build the approved knowledge source files and the loader that
compiles them into a system prompt.  This is the foundation for answer
grounding.

| Deliverable | Location |
|-------------|----------|
| `backend/knowledge/profile.json` | Personal profile data |
| `backend/knowledge/experience.json` | Work experience |
| `backend/knowledge/projects.json` | Public projects |
| `backend/knowledge/publications.json` | Research publications |
| `backend/knowledge/faq.json` | Pre-approved FAQ pairs |
| `backend/app/services/knowledge_base.py` | JSON loader + prompt renderer |

**Tests written first (`test_knowledge_base.py` — 37 tests):**

| Test Class | Tests | Purpose |
|------------|-------|---------|
| `TestLoadJson` | 7 | Each source file loads; missing/invalid files degrade gracefully |
| `TestLoadAll` | 2 | All 5 source files returned as dict of dicts |
| `TestKnowledgeSchemas` | 5 | Required fields present in each JSON file |
| `TestRenderProfile` | 4 | Name, education, skills rendered; empty → empty string |
| `TestRenderExperience` | 2 | Position titles rendered; empty → empty string |
| `TestRenderProjects` | 2 | Project names rendered; empty → empty string |
| `TestRenderPublications` | 1 | Empty publications → empty string |
| `TestRenderFaq` | 2 | Q/A pairs rendered; empty → empty string |
| `TestBuildContext` | 6 | Context non-empty, contains citations, grounding instructions |
| `TestGetContext` | 2 | Caching + reload behavior |
| `TestGroundingConstraints` | 4 | Grounding instructions, refusal guidelines, no private data |

---

### Phase 3 — Safety Policy Engine (Pre-Filter + System Prompt)

**Goal:** Implement the two-layer content policy.  Layer 1 (regex pre-filter)
is fast and synchronous.  Layer 2 (system prompt) is injected into every LLM
call.  Depends on Phase 2 for the knowledge context.

| Deliverable | Location |
|-------------|----------|
| `backend/app/services/policy_guard.py` | `is_blocked()`, `build_messages()`, `BLOCKED_PATTERNS` |

**Tests written first (`test_policy_guard.py` — 46 tests):**

| Test Class | Tests | Purpose |
|------------|-------|---------|
| `TestIsBlocked` | 41 | Prompt injection (12), private data (5), secrets (5), deployment (3), architecture (4), role hijacking (5), false-positive checks (3), edge cases (4) |
| `TestBuildMessages` | 5 | Returns list of dicts, system prompt present, user message last, exactly 2 messages |

---

### Phase 4 — Metrics Store

**Goal:** In-memory, thread-safe counters that track request volume, blocked
messages, latency distribution, and token usage.  No external dependency.

| Deliverable | Location |
|-------------|----------|
| `backend/app/services/metrics_store.py` | `MetricsStore` class, global `metrics` singleton |

**Tests written first (`test_metrics.py` — 14 tests):**

| Test | Purpose |
|------|---------|
| `test_initial_counters_are_zero` | Fresh store has zeroed counters |
| `test_record_request_increments` | `total_requests` counter |
| `test_record_blocked_increments` | `blocked_requests` counter |
| `test_record_rate_limited_increments` | `rate_limited_requests` counter |
| `test_record_concurrency_rejected_increments` | `concurrency_rejected_requests` counter |
| `test_record_llm_request_increments` | `llm_requests` counter |
| `test_record_response_increments_successful` | `successful_responses` counter |
| `test_latency_bucket_lt_1s` | < 1 s latency bucket |
| `test_latency_bucket_1s_to_3s` | 1–3 s latency bucket |
| `test_latency_bucket_3s_to_10s` | 3–10 s latency bucket |
| `test_latency_bucket_gt_10s` | > 10 s latency bucket |
| `test_token_counts_accumulated` | Prompt + completion token accumulation |
| `test_snapshot_returns_copy` | Snapshot is independent of live store |
| `test_initial_latency_buckets_present` | All 4 bucket keys exist at init |

---

### Phase 5 — Rate Limiter Middleware

**Goal:** Per-client-IP token-bucket algorithm enforced as Starlette
middleware.  Depends on Phase 4 for metrics recording.

| Deliverable | Location |
|-------------|----------|
| `backend/app/middleware/rate_limiter.py` | `RateLimiterMiddleware`, `TokenBucket` |

**Tests written first (`test_rate_limiter.py` — 13 tests):**

| Test Class | Tests | Purpose |
|------------|-------|---------|
| `TestBucketMechanics` | 6 | Capacity, exhaustion, retry-after, independent keys, refill, cap |
| `TestRateLimiterBurstBehaviour` | 2 | 10-request burst then blocked; retry-after ≈ refill interval |
| `TestClientKeyResolution` | 5 | Direct IP, X-Forwarded-For, multiple IPs, missing client, empty header |

---

### Phase 6 — Concurrency Limiter Middleware

**Goal:** Asyncio-semaphore guard that rejects excess in-flight requests with
503.  Depends on Phase 4 for metrics recording.

| Deliverable | Location |
|-------------|----------|
| `backend/app/middleware/concurrency.py` | `ConcurrencyLimiterMiddleware` |

**Tests written first (`test_concurrency.py` — 4 tests):**

| Test | Purpose |
|------|---------|
| `test_semaphore_allows_up_to_max` | N requests proceed concurrently |
| `test_semaphore_releases_correctly` | Slot freed after response |
| `test_non_blocking_acquire_fails_when_full` | Immediate rejection, no queueing |
| `test_max_attribute_stored` | Configuration value stored correctly |

---

### Phase 7 — LLM Client (OpenAI Wrapper)

**Goal:** Thin async wrapper around `openai.AsyncOpenAI`.  Always mocked in
tests; only tested live during manual smoke tests.

| Deliverable | Location |
|-------------|----------|
| `backend/app/services/llm_client.py` | `complete()`, `LLMResponse` |

**Tests written first:**
- Mock-based fixture in `conftest.py` validates interface contract.
- Integration tests in `test_chat.py` exercise the full path via the mock.

---

### Phase 8 — Chat API Endpoint

**Goal:** `POST /api/chat` — the main entry point.  Ties together all
previous phases: validation → policy → LLM → metrics.

| Deliverable | Location |
|-------------|----------|
| `backend/app/api/chat.py` | `chat()` handler |

**Tests written first (`test_chat.py` — 13 tests):**

| Test Class | Tests | Purpose |
|------------|-------|---------|
| `TestChatHappyPath` | 3 | 200 with reply, short message, max-length message |
| `TestChatInputValidation` | 3 | Exceeds max length → 422, missing field → 422, empty body → 422 |
| `TestChatPolicyViolation` | 3 | Blocked → refusal, jailbreak → blocked, private info → blocked |
| `TestChatRateLimit` | 1 | Burst exhausted → 429 |
| `TestChatConcurrencyLimit` | 1 | Semaphore full → 503 |
| `TestChatMetricsIntegration` | 2 | Successful → counters increment, blocked → blocked counter |

---

### Phase 9 — Metrics API Endpoint

**Goal:** `GET /api/metrics` — public dashboard data source.

| Deliverable | Location |
|-------------|----------|
| `backend/app/api/metrics.py` | `get_metrics()` handler |

**Tests written first (`test_metrics_api.py` — 6 tests):**

| Test | Purpose |
|------|---------|
| `test_returns_200` | Endpoint responds |
| `test_returns_json` | Content-Type is JSON |
| `test_response_has_required_fields` | All `MetricsResponse` fields present |
| `test_latency_buckets_has_correct_keys` | 4 expected bucket keys |
| `test_counters_are_integers` | No floats or strings |
| `test_metrics_reflect_chat_activity` | Counters change after a chat request |

---

### Phase 10 — App Factory & Middleware Wiring

**Goal:** `create_app()` — factory function that wires CORS, rate limiter,
concurrency limiter, and routers.

| Deliverable | Location |
|-------------|----------|
| `backend/app/main.py` | `create_app()`, module-level `app` |

**Verified by:** All integration tests in `test_chat.py` and `test_metrics_api.py`
which create a fresh app via `conftest.py::client` fixture.

---

### Phase 11 — Frontend (Static Site)

**Goal:** Chat UI + Metrics dashboard served via GitHub Pages.

| Deliverable | Location |
|-------------|----------|
| `frontend/index.html` | Chat interface |
| `frontend/metrics.html` | Metrics dashboard |
| `frontend/js/chat.js` | Chat logic (API calls, rendering) |
| `frontend/js/metrics.js` | Metrics polling + display |
| `frontend/css/style.css` | Styling |

**Tests (manual / smoke):**
- Chat form submission sends POST to backend.
- Typing indicator appears during LLM call.
- Error messages display on 429 / 503.
- Metrics page polls and renders counters.
- CORS preflight succeeds from allowed origin.

---

### Phase 12 — Documentation

**Goal:** Complete the doc set so the project is self-documenting.

| Deliverable | Location |
|-------------|----------|
| `docs/SYSTEM_DESIGN.md` | Full architecture document |
| `docs/SAFETY_POLICY.md` | Content policy specification |
| `docs/REQUEST_CONTROL.md` | Rate limiting / concurrency design |
| `docs/KNOWLEDGE_SYSTEM.md` | Knowledge system design |
| `docs/TEST_PLAN.md` | Test strategy and coverage mapping |
| `docs/READING_GUIDE.md` | Developer navigation guide |
| `docs/TROUBLESHOOTING.md` | Common failure modes |
| `docs/IMPLEMENTATION_PLAN.md` | This document |
| `README.md` | Project overview, quick start |

---

## 2. Dependency-Aware Implementation Order

The dependency graph determines which phases must complete before others
can start.

```
Phase 0: Skeleton / Config
  │
  ├── Phase 1: Models (schemas)
  │
  ├── Phase 2: Knowledge Base
  │     │
  │     └── Phase 3: Policy Guard (depends on knowledge context)
  │
  ├── Phase 4: Metrics Store
  │     │
  │     ├── Phase 5: Rate Limiter (records metrics)
  │     │
  │     └── Phase 6: Concurrency Limiter (records metrics)
  │
  └── Phase 7: LLM Client
        │
        └── Phase 8: Chat API (depends on 1, 3, 4, 5, 6, 7)
              │
              └── Phase 9: Metrics API (depends on 4)
                    │
                    └── Phase 10: App Factory (wires 5, 6, 8, 9)
                          │
                          └── Phase 11: Frontend (depends on deployed backend)
                                │
                                └── Phase 12: Documentation (parallel)
```

### Critical Path

```
Phase 0 → Phase 2 → Phase 3 → Phase 8 → Phase 10
```

The longest dependency chain runs from project skeleton through knowledge
base, policy guard, and the chat endpoint to the app factory.

### Parallelizable Phases

| Parallel Group | Phases |
|----------------|--------|
| Group A | Phase 1 (models), Phase 2 (knowledge), Phase 4 (metrics), Phase 7 (LLM client) |
| Group B | Phase 5 (rate limiter), Phase 6 (concurrency limiter) — after Phase 4 |
| Group C | Phase 3 (policy guard) — after Phase 2 |
| Group D | Phase 11 (frontend), Phase 12 (docs) — after Phase 10 |

---

## 3. Test Requirements for Each Phase

Every phase must satisfy these requirements **before** implementation begins:

### Process Rule

> **No component implementation should proceed before the relevant tests and
> test documentation for that component exist.**

### Per-Phase Checklist

| # | Phase | Test File(s) | Min Tests | Coverage Target |
|---|-------|-------------|-----------|----------------|
| 0 | Skeleton / Config | (implicit — config tested by all others) | 0 | — |
| 1 | Models | `test_chat.py::TestChatInputValidation` | 3 | 100% of `models.py` |
| 2 | Knowledge Base | `test_knowledge_base.py` | 37 | ≥ 90% of `knowledge_base.py` |
| 3 | Policy Guard | `test_policy_guard.py` | 46 | ≥ 85% of `policy_guard.py` |
| 4 | Metrics Store | `test_metrics.py` | 14 | 100% of `metrics_store.py` |
| 5 | Rate Limiter | `test_rate_limiter.py` | 13 | 100% of `rate_limiter.py` |
| 6 | Concurrency | `test_concurrency.py` | 4 | 100% of `concurrency.py` |
| 7 | LLM Client | `conftest.py::mock_llm` | 0 (mocked) | — |
| 8 | Chat API | `test_chat.py` | 13 | ≥ 85% of `chat.py` |
| 9 | Metrics API | `test_metrics_api.py` | 6 | 100% of `metrics.py` |
| 10 | App Factory | (covered by integration tests) | 0 | 100% of `main.py` |
| 11 | Frontend | Manual smoke tests | N/A | N/A |
| 12 | Documentation | (reviewed, not automated) | N/A | N/A |

### Test-First Workflow per Phase

```
1. Write test stubs (all tests fail initially — red)
2. Document expected behavior in test docstrings
3. Update TEST_PLAN.md with new test-to-requirement mappings
4. Implement minimum code to pass all tests (green)
5. Refactor for clarity and style (refactor)
6. Verify coverage target met
7. Commit with "tests: ..." then "feat: ..." messages
```

---

## 4. Completion Criteria for Each Phase

### Phase 0 — Skeleton / Config
- [ ] `pytest tests/ -v` runs without import errors
- [ ] `Settings()` instantiates with defaults
- [ ] `conftest.py` provides `client`, `mock_llm`, `reset_metrics` fixtures

### Phase 1 — Models
- [ ] `ChatRequest` rejects messages > 1 000 chars (422)
- [ ] `ChatRequest` rejects missing / empty `message` field (422)
- [ ] `ChatResponse` serializes `reply` + `blocked` fields
- [ ] `MetricsResponse` includes all 9 counter fields

### Phase 2 — Knowledge Base
- [ ] All 5 JSON files load without error
- [ ] Missing / malformed files return `{}` (graceful degradation)
- [ ] `build_context()` returns non-empty string with `[source: ...]` citations
- [ ] Schema validation passes for all knowledge files
- [ ] No private data (email, phone, SSN, salary) in any knowledge file
- [ ] 37 tests pass

### Phase 3 — Policy Guard
- [ ] `is_blocked()` rejects all 31+ blocked patterns
- [ ] `is_blocked()` allows clean portfolio questions (no false positives)
- [ ] `build_messages()` returns `[system, user]` message list
- [ ] System prompt contains knowledge-base context (not hardcoded fallback)
- [ ] 46 tests pass

### Phase 4 — Metrics Store
- [ ] All counters start at zero
- [ ] Each `record_*()` method increments the correct counter
- [ ] Latency buckets classify correctly: <1s, 1–3s, 3–10s, >10s
- [ ] `snapshot()` returns a copy (not a reference)
- [ ] Thread-safe under concurrent access
- [ ] 14 tests pass

### Phase 5 — Rate Limiter
- [ ] Token bucket allows up to `capacity` burst requests
- [ ] Exhausted bucket returns 429 with `Retry-After` header
- [ ] Different client IPs have independent buckets
- [ ] Tokens refill at the configured rate
- [ ] Client key resolves correctly with/without proxy headers
- [ ] 13 tests pass

### Phase 6 — Concurrency Limiter
- [ ] Semaphore allows up to `max_concurrent` requests
- [ ] Excess requests receive immediate 503 (no queueing)
- [ ] Semaphore releases after response completes
- [ ] Only `/api/chat` is guarded
- [ ] 4 tests pass

### Phase 7 — LLM Client
- [ ] `complete()` returns `LLMResponse` with `text`, `prompt_tokens`, `completion_tokens`
- [ ] Mock fixture in `conftest.py` replaces real client
- [ ] All downstream tests use mock (no real API calls in CI)

### Phase 8 — Chat API
- [ ] Happy path: 200 with LLM reply
- [ ] Input validation: 422 on bad input
- [ ] Policy block: 200 with `blocked=true` and refusal message
- [ ] Rate limit: 429 after burst exhausted
- [ ] Concurrency limit: 503 when semaphore full
- [ ] Metrics counters increment correctly
- [ ] 13 tests pass

### Phase 9 — Metrics API
- [ ] `GET /api/metrics` returns 200 with JSON
- [ ] Response matches `MetricsResponse` schema
- [ ] Counters reflect actual chat activity
- [ ] 6 tests pass

### Phase 10 — App Factory
- [ ] `create_app()` wires CORS, rate limiter, concurrency limiter, routers
- [ ] All integration tests pass against fresh app instance
- [ ] Middleware execution order is correct (CORS → rate limiter → concurrency)

### Phase 11 — Frontend
- [ ] `index.html` loads without console errors
- [ ] Chat form submits to `POST /api/chat`
- [ ] Error states (429, 503) display user-friendly messages
- [ ] `metrics.html` polls `GET /api/metrics` and renders counters
- [ ] CORS preflight succeeds from allowed origin

### Phase 12 — Documentation
- [ ] All 8 doc files exist and are internally consistent
- [ ] `SYSTEM_DESIGN.md` matches actual code structure
- [ ] `TEST_PLAN.md` maps every requirement to a test
- [ ] `README.md` has correct quick-start instructions

---

## 5. Rollback / Debugging Strategy

### If a Phase Fails

| Failure Type | Strategy |
|-------------|----------|
| **Tests fail after implementation** | Revert the implementation commit; investigate the failing test in isolation. Do not modify the test unless the specification was wrong. |
| **Unexpected import errors** | Check dependency order — the phase may depend on a prior phase that wasn't completed. Verify `__init__.py` files exist. |
| **Coverage below target** | Add missing test cases or simplify the implementation to reduce untested branches. |
| **Integration test fails but unit tests pass** | The middleware wiring or app factory is misconfigured. Inspect `main.py` registration order and fixture setup. |
| **Flaky async tests** | Check for shared mutable state (global singletons like `metrics`). Use `reset_metrics` fixture. Ensure `asyncio_mode = auto` in `pytest.ini`. |

### Debugging Checklist

```
1. Run the failing test in isolation:
   pytest tests/test_xxx.py::TestClass::test_name -v -s

2. Check fixture chain:
   pytest tests/test_xxx.py --setup-show

3. Enable debug logging:
   pytest tests/test_xxx.py -v -s --log-cli-level=DEBUG

4. Verify no import side effects:
   python -c "from app.services.knowledge_base import load_all; print(load_all().keys())"

5. Check coverage for the specific module:
   pytest tests/test_xxx.py --cov=app.services.xxx --cov-report=term-missing

6. If stuck, bisect the git history:
   git bisect start HEAD <last-known-good-commit>
   git bisect run pytest tests/test_xxx.py
```

### Rollback Commands

```bash
# Revert the last commit (keep tests, discard implementation)
git revert HEAD

# Soft reset to undo commit but keep changes staged
git reset --soft HEAD~1

# Hard reset to last known-good state
git reset --hard <commit-sha>
```

---

## 6. Mapping from Requirements to Tests

### Functional Requirements

| ID | Requirement | Test(s) | Phase |
|----|-------------|---------|-------|
| F-01 | Chat endpoint accepts a message and returns an LLM reply | `test_chat::TestChatHappyPath::test_returns_200_with_reply` | 8 |
| F-02 | Input length limited to 1 000 characters | `test_chat::TestChatInputValidation::test_message_exceeds_max_length_returns_422` | 1, 8 |
| F-03 | Missing/empty message returns 422 | `test_chat::TestChatInputValidation::test_missing_message_field_returns_422`, `test_empty_body_returns_422` | 1, 8 |
| F-04 | Policy-violating messages return refusal | `test_chat::TestChatPolicyViolation::test_blocked_message_returns_200_with_refusal` | 3, 8 |
| F-05 | Metrics endpoint returns JSON counters | `test_metrics_api::TestMetricsEndpoint::test_returns_200` | 9 |
| F-06 | Knowledge loaded from structured JSON files | `test_knowledge_base::TestLoadJson::test_loads_valid_*` (5 tests) | 2 |
| F-07 | System prompt contains source citations | `test_knowledge_base::TestBuildContext::test_contains_source_citations` | 2 |
| F-08 | Context grounding instructions present | `test_knowledge_base::TestBuildContext::test_contains_grounding_instructions` | 2 |

### Non-Functional Requirements

| ID | Requirement | Test(s) | Phase |
|----|-------------|---------|-------|
| NF-01 | Rate limit: 10 burst, 1/10 min degraded | `test_rate_limiter::TestBucketMechanics` (6 tests), `TestRateLimiterBurstBehaviour` (2 tests) | 5 |
| NF-02 | Rate limit returns 429 + Retry-After | `test_chat::TestChatRateLimit::test_rate_limited_after_burst` | 5, 8 |
| NF-03 | Concurrency limit: max 10 in-flight | `test_concurrency::TestConcurrencyLimiter` (4 tests) | 6 |
| NF-04 | Concurrency limit returns 503 | `test_chat::TestChatConcurrencyLimit::test_concurrency_limited_returns_503` | 6, 8 |
| NF-05 | Visitor identity: hashed client IP | `test_rate_limiter::TestClientKeyResolution` (5 tests) | 5 |
| NF-06 | Thread-safe metrics | `test_metrics::TestMetricsStore::test_snapshot_returns_copy` | 4 |

### Security / Safety Requirements

| ID | Requirement | Test(s) | Phase |
|----|-------------|---------|-------|
| S-01 | Prompt injection blocked (12 patterns) | `test_policy_guard::TestIsBlocked::test_prompt_injection_*` (12 tests) | 3 |
| S-02 | Private data requests blocked | `test_policy_guard::TestIsBlocked::test_private_*` (5 tests) | 3 |
| S-03 | Secret exfiltration blocked | `test_policy_guard::TestIsBlocked::test_secret_*` (5 tests) | 3 |
| S-04 | Deployment probing blocked | `test_policy_guard::TestIsBlocked::test_deployment_*` (3 tests) | 3 |
| S-05 | Architecture probing blocked | `test_policy_guard::TestIsBlocked::test_architecture_*` (4 tests) | 3 |
| S-06 | No false positives on clean input | `test_policy_guard::TestIsBlocked::test_no_false_positive_on_*` (3 tests), `test_clean_question_allowed`, `test_experience_question_allowed`, `test_skills_question_allowed` | 3 |
| S-07 | System prompt contains refusal guidelines | `test_knowledge_base::TestBuildContext::test_contains_refusal_guidelines` | 2 |
| S-08 | No private data in knowledge files | `test_knowledge_base::TestGroundingConstraints::test_no_private_data_in_knowledge_files` | 2 |
| S-09 | Only approved information in context | `test_knowledge_base::TestGroundingConstraints::test_context_instructs_only_approved_info` | 2 |

### Knowledge / Grounding Requirements

| ID | Requirement | Test(s) | Phase |
|----|-------------|---------|-------|
| K-01 | Profile JSON has required fields | `test_knowledge_base::TestKnowledgeSchemas::test_profile_has_required_fields` | 2 |
| K-02 | Experience JSON has required fields | `test_knowledge_base::TestKnowledgeSchemas::test_experience_positions_have_required_fields` | 2 |
| K-03 | Projects JSON has required fields | `test_knowledge_base::TestKnowledgeSchemas::test_projects_entries_have_required_fields` | 2 |
| K-04 | FAQ JSON has required fields | `test_knowledge_base::TestKnowledgeSchemas::test_faq_entries_have_question_and_answer` | 2 |
| K-05 | Context contains profile data | `test_knowledge_base::TestBuildContext::test_contains_key_facts` | 2 |
| K-06 | Context is cached for performance | `test_knowledge_base::TestGetContext::test_returns_cached_context` | 2 |
| K-07 | Context can be reloaded | `test_knowledge_base::TestGetContext::test_reload_rebuilds_context` | 2 |
| K-08 | Graceful fallback on missing files | `test_knowledge_base::TestLoadJson::test_missing_file_returns_empty_dict` | 2 |
| K-09 | Graceful fallback on invalid JSON | `test_knowledge_base::TestLoadJson::test_invalid_json_returns_empty_dict` | 2 |

---

## 7. Test Categories

### 7.1 Schema Tests

Validate the structure and required fields of data files and API models.

| Test | File | What It Validates |
|------|------|-------------------|
| `test_profile_has_required_fields` | `test_knowledge_base.py` | `name`, `education`, `skills`, `links` in `profile.json` |
| `test_profile_education_entries` | `test_knowledge_base.py` | Each education entry has `degree`, `institution`, `year` |
| `test_experience_positions_have_required_fields` | `test_knowledge_base.py` | Each position has `title`, `organization`, `start_date` |
| `test_projects_entries_have_required_fields` | `test_knowledge_base.py` | Each project has `name`, `description`, `url` |
| `test_faq_entries_have_question_and_answer` | `test_knowledge_base.py` | Each FAQ has `question`, `answer` |
| `test_response_has_required_fields` | `test_metrics_api.py` | `MetricsResponse` has all 9 fields |
| `test_latency_buckets_has_correct_keys` | `test_metrics_api.py` | 4 expected bucket keys |

### 7.2 Policy Tests

Validate the content policy pre-filter blocks unsafe input and allows safe input.

| Test | File | Pattern Category |
|------|------|-----------------|
| `test_prompt_injection_*` (12) | `test_policy_guard.py` | Prompt injection attempts |
| `test_private_*` (5) | `test_policy_guard.py` | Private data requests |
| `test_secret_*` (5) | `test_policy_guard.py` | Secret exfiltration |
| `test_deployment_*` (3) | `test_policy_guard.py` | Deployment probing |
| `test_architecture_*` (4) | `test_policy_guard.py` | Architecture probing |
| `test_act_as_pattern` | `test_policy_guard.py` | Role hijacking |
| `test_no_false_positive_on_*` (3) | `test_policy_guard.py` | False-positive prevention |
| `test_clean_question_allowed` | `test_policy_guard.py` | Legitimate question |
| `test_case_insensitive_matching` | `test_policy_guard.py` | Case normalization |
| `test_empty_string_allowed` | `test_policy_guard.py` | Edge case — empty input |

### 7.3 Validation Tests

Validate request input constraints.

| Test | File | Constraint |
|------|------|-----------|
| `test_message_exceeds_max_length_returns_422` | `test_chat.py` | Max 1 000 chars |
| `test_missing_message_field_returns_422` | `test_chat.py` | Required `message` field |
| `test_empty_body_returns_422` | `test_chat.py` | Non-empty request body |

### 7.4 Rate Limit Tests

Validate the token-bucket rate limiter.

| Test | File | Behavior |
|------|------|---------|
| `test_fresh_bucket_allows_up_to_capacity` | `test_rate_limiter.py` | Burst allowance |
| `test_bucket_exhausted_after_capacity` | `test_rate_limiter.py` | Denial after burst |
| `test_retry_after_is_positive_when_denied` | `test_rate_limiter.py` | Retry-After header |
| `test_different_keys_have_independent_buckets` | `test_rate_limiter.py` | Per-IP isolation |
| `test_tokens_refill_over_time` | `test_rate_limiter.py` | Token replenishment |
| `test_tokens_do_not_exceed_capacity` | `test_rate_limiter.py` | Cap enforcement |
| `test_ten_requests_allowed_then_blocked` | `test_rate_limiter.py` | Full burst scenario |
| `test_retry_after_approximately_one_refill_interval` | `test_rate_limiter.py` | Retry timing |
| `test_client_key_*` (5) | `test_rate_limiter.py` | Client identity resolution |

### 7.5 Concurrency Tests

Validate the asyncio semaphore guard.

| Test | File | Behavior |
|------|------|---------|
| `test_semaphore_allows_up_to_max` | `test_concurrency.py` | Parallel capacity |
| `test_semaphore_releases_correctly` | `test_concurrency.py` | Slot reclamation |
| `test_non_blocking_acquire_fails_when_full` | `test_concurrency.py` | Immediate rejection |
| `test_max_attribute_stored` | `test_concurrency.py` | Config correctness |

### 7.6 Backend API Tests (Integration)

End-to-end tests that exercise the full request lifecycle through the FastAPI app.

| Test | File | Lifecycle Stage |
|------|------|----------------|
| `test_returns_200_with_reply` | `test_chat.py` | Happy path |
| `test_valid_short_message` | `test_chat.py` | Edge case — short input |
| `test_valid_max_length_message` | `test_chat.py` | Edge case — max-length input |
| `test_blocked_message_returns_200_with_refusal` | `test_chat.py` | Policy block → refusal |
| `test_jailbreak_attempt_is_blocked` | `test_chat.py` | Prompt injection → block |
| `test_private_info_request_is_blocked` | `test_chat.py` | Private data → block |
| `test_rate_limited_after_burst` | `test_chat.py` | Rate limit → 429 |
| `test_concurrency_limited_returns_503` | `test_chat.py` | Concurrency → 503 |
| `test_successful_request_increments_counters` | `test_chat.py` | Metrics integration |
| `test_blocked_request_increments_blocked_counter` | `test_chat.py` | Metrics integration |
| `test_returns_200` | `test_metrics_api.py` | Metrics endpoint |
| `test_metrics_reflect_chat_activity` | `test_metrics_api.py` | Cross-endpoint integration |

### 7.7 Frontend Smoke Tests

Manual tests performed against a running frontend + backend.

| Test | Steps | Expected |
|------|-------|----------|
| Chat happy path | Type "Tell me about your projects" → Submit | LLM reply appears in chat |
| Input too long | Paste 1 001+ chars → Submit | Error message shown |
| Rate limit | Send 11 messages quickly | "Too many requests" after 10th |
| Server busy | Saturate concurrency limit | "Server busy" message |
| Metrics dashboard | Open `metrics.html` | Counters render and update |
| CORS check | Open browser console → check no CORS errors | No blocked requests |

### 7.8 Metrics Tests

Validate the in-memory metrics accumulator.

| Test | File | Counter |
|------|------|---------|
| `test_initial_counters_are_zero` | `test_metrics.py` | All counters |
| `test_record_request_increments` | `test_metrics.py` | `total_requests` |
| `test_record_blocked_increments` | `test_metrics.py` | `blocked_requests` |
| `test_record_rate_limited_increments` | `test_metrics.py` | `rate_limited_requests` |
| `test_record_concurrency_rejected_increments` | `test_metrics.py` | `concurrency_rejected_requests` |
| `test_record_llm_request_increments` | `test_metrics.py` | `llm_requests` |
| `test_record_response_increments_successful` | `test_metrics.py` | `successful_responses` |
| `test_latency_bucket_*` (4) | `test_metrics.py` | Latency distribution |
| `test_token_counts_accumulated` | `test_metrics.py` | Token counters |
| `test_snapshot_returns_copy` | `test_metrics.py` | Isolation |
| `test_initial_latency_buckets_present` | `test_metrics.py` | Initialization |

### 7.9 End-to-End Tests

Tests that verify the full system from frontend request to backend response.

| Test | Type | Coverage |
|------|------|---------|
| Integration tests in `test_chat.py` | Automated (httpx + ASGITransport) | Backend request lifecycle |
| Integration tests in `test_metrics_api.py` | Automated (httpx + ASGITransport) | Metrics collection + API |
| Frontend smoke tests | Manual | Browser → GitHub Pages → Backend → LLM |

**Note:** True end-to-end tests (frontend → backend → live LLM) are manual
because they require a real OpenAI API key.  The automated integration tests
in `test_chat.py` cover the backend end-to-end using a mock LLM.

---

## 8. Traceability Matrix

### Requirements → Tests → Code → Docs

| Req ID | Requirement | Test File(s) | Test Count | Source Code | Design Doc |
|--------|-------------|-------------|------------|-------------|------------|
| F-01 | Chat endpoint returns LLM reply | `test_chat.py` | 3 | `api/chat.py` | SYSTEM_DESIGN §7 |
| F-02 | Input length limit | `test_chat.py` | 1 | `models.py` | SYSTEM_DESIGN §11 |
| F-03 | Missing message → 422 | `test_chat.py` | 2 | `models.py` | SYSTEM_DESIGN §11 |
| F-04 | Policy block → refusal | `test_chat.py` | 3 | `services/policy_guard.py` | SAFETY_POLICY §1 |
| F-05 | Metrics endpoint | `test_metrics_api.py` | 6 | `api/metrics.py` | SYSTEM_DESIGN §14 |
| F-06 | Knowledge loaded from JSON | `test_knowledge_base.py` | 7 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §2 |
| F-07 | Source citations in context | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §7 |
| F-08 | Grounding instructions | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §8 |
| NF-01 | Rate limit algorithm | `test_rate_limiter.py` | 8 | `middleware/rate_limiter.py` | REQUEST_CONTROL §2–3 |
| NF-02 | Rate limit → 429 | `test_chat.py` | 1 | `middleware/rate_limiter.py` | REQUEST_CONTROL §6 |
| NF-03 | Concurrency limit | `test_concurrency.py` | 4 | `middleware/concurrency.py` | REQUEST_CONTROL §4 |
| NF-04 | Concurrency → 503 | `test_chat.py` | 1 | `middleware/concurrency.py` | REQUEST_CONTROL §6 |
| NF-05 | Visitor identity | `test_rate_limiter.py` | 5 | `middleware/rate_limiter.py` | REQUEST_CONTROL §1 |
| NF-06 | Thread-safe metrics | `test_metrics.py` | 1 | `services/metrics_store.py` | SYSTEM_DESIGN §14 |
| S-01 | Prompt injection blocked | `test_policy_guard.py` | 12 | `services/policy_guard.py` | SAFETY_POLICY §8 |
| S-02 | Private data blocked | `test_policy_guard.py` | 5 | `services/policy_guard.py` | SAFETY_POLICY §3 |
| S-03 | Secrets blocked | `test_policy_guard.py` | 5 | `services/policy_guard.py` | SAFETY_POLICY §3 |
| S-04 | Deployment probing blocked | `test_policy_guard.py` | 3 | `services/policy_guard.py` | SAFETY_POLICY §3 |
| S-05 | Architecture probing blocked | `test_policy_guard.py` | 4 | `services/policy_guard.py` | SAFETY_POLICY §3 |
| S-06 | No false positives | `test_policy_guard.py` | 6 | `services/policy_guard.py` | SAFETY_POLICY §5 |
| S-07 | Refusal guidelines | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | SAFETY_POLICY §4 |
| S-08 | No private data in files | `test_knowledge_base.py` | 1 | `knowledge/*.json` | KNOWLEDGE_SYSTEM §4 |
| S-09 | Only approved info | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §10 |
| K-01 | Profile schema | `test_knowledge_base.py` | 2 | `knowledge/profile.json` | KNOWLEDGE_SYSTEM §3 |
| K-02 | Experience schema | `test_knowledge_base.py` | 1 | `knowledge/experience.json` | KNOWLEDGE_SYSTEM §3 |
| K-03 | Projects schema | `test_knowledge_base.py` | 1 | `knowledge/projects.json` | KNOWLEDGE_SYSTEM §3 |
| K-04 | FAQ schema | `test_knowledge_base.py` | 1 | `knowledge/faq.json` | KNOWLEDGE_SYSTEM §3 |
| K-05 | Context contains facts | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §5 |
| K-06 | Context caching | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §5 |
| K-07 | Context reload | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §5 |
| K-08 | Missing file fallback | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §5 |
| K-09 | Invalid JSON fallback | `test_knowledge_base.py` | 1 | `services/knowledge_base.py` | KNOWLEDGE_SYSTEM §5 |

**Totals:** 31 requirements → 133 tests → 12 source files → 8 design docs

---

## 9. Definition of Done for Each Module

### `backend/app/config.py`
- [ ] Pydantic Settings model loads from environment / `.env`
- [ ] All settings have sensible defaults
- [ ] `origins_list` property correctly splits comma-separated values
- [ ] No secrets hardcoded (only test defaults like `"test-key"`)

### `backend/app/models.py`
- [ ] `ChatRequest` validates `message` field (required, max length)
- [ ] `ChatResponse` includes `reply` and `blocked` fields
- [ ] `MetricsResponse` includes all 9 counter fields
- [ ] 100% line coverage

### `backend/knowledge/*.json` (5 files)
- [ ] All files parse as valid JSON objects
- [ ] Each file has all required fields per its schema
- [ ] No private data (email, phone, SSN, salary, address)
- [ ] Information matches the portfolio owner's actual public profile

### `backend/app/services/knowledge_base.py`
- [ ] Loads all 5 knowledge files
- [ ] Graceful degradation on missing/invalid files
- [ ] `build_context()` returns tagged sections with `[source: ...]` citations
- [ ] Grounding instructions and refusal guidelines included
- [ ] Context cached; `reload()` rebuilds from disk
- [ ] ≥ 90% line coverage
- [ ] 37 tests pass

### `backend/app/services/policy_guard.py`
- [ ] `is_blocked()` matches all 31+ blocked patterns
- [ ] No false positives on 6+ clean input examples
- [ ] `build_messages()` returns `[system, user]` messages
- [ ] System prompt uses knowledge-base context (not just fallback)
- [ ] ≥ 85% line coverage
- [ ] 46 tests pass

### `backend/app/services/metrics_store.py`
- [ ] Thread-safe via `threading.Lock`
- [ ] All counters zeroed on construction
- [ ] 4 latency buckets: <1s, 1–3s, 3–10s, >10s
- [ ] `snapshot()` returns a deep copy
- [ ] 100% line coverage
- [ ] 14 tests pass

### `backend/app/services/llm_client.py`
- [ ] `complete()` calls `openai.AsyncOpenAI.chat.completions.create`
- [ ] Returns `LLMResponse(text, prompt_tokens, completion_tokens)`
- [ ] Lazy client initialization
- [ ] Always mocked in automated tests

### `backend/app/middleware/rate_limiter.py`
- [ ] Token-bucket per hashed client IP
- [ ] Burst capacity = `RATE_LIMIT_BURST` (default 10)
- [ ] Refill = 1 token per `RATE_LIMIT_REFILL_INTERVAL` seconds (default 600)
- [ ] Returns 429 + `Retry-After` header when denied
- [ ] Only guards `/api/chat`
- [ ] 100% line coverage
- [ ] 13 tests pass

### `backend/app/middleware/concurrency.py`
- [ ] `asyncio.Semaphore(max_concurrent)` guard
- [ ] Immediate 503 when all slots occupied (no queueing)
- [ ] Slot released after response completes
- [ ] Only guards `/api/chat`
- [ ] 100% line coverage
- [ ] 4 tests pass

### `backend/app/api/chat.py`
- [ ] `POST /api/chat` — accepts `ChatRequest`, returns `ChatResponse`
- [ ] Policy pre-filter → refusal if blocked
- [ ] LLM call with system prompt from knowledge base
- [ ] Metrics recorded for each request outcome
- [ ] 500 on LLM exception (no stack trace leaked)
- [ ] ≥ 85% line coverage
- [ ] 13 tests pass

### `backend/app/api/metrics.py`
- [ ] `GET /api/metrics` — returns `MetricsResponse`
- [ ] Reads from `MetricsStore.snapshot()`
- [ ] 100% line coverage
- [ ] 6 tests pass

### `backend/app/main.py`
- [ ] `create_app()` factory returns configured `FastAPI` instance
- [ ] CORS middleware registered with `origins_list`
- [ ] Rate limiter middleware registered
- [ ] Concurrency limiter middleware registered
- [ ] Chat and metrics routers mounted at `/api`
- [ ] 100% line coverage

### `frontend/` (static site)
- [ ] Chat interface functional (form → API → response display)
- [ ] Metrics dashboard polls and renders
- [ ] Error states displayed for 429, 503, network errors
- [ ] Responsive layout for mobile/desktop

---

## 10. Mock vs Real Recommendation

### What Should Be Mocked

| Component | Mock Strategy | Reason |
|-----------|--------------|--------|
| **OpenAI API** (`llm_client.complete`) | `AsyncMock` in `conftest.py::mock_llm` | Avoids real API costs and latency; eliminates flakiness from network issues; enables deterministic response testing |
| **Time** (`time.monotonic`) | `monkeypatch` when testing latency buckets or token refill | Enables testing time-dependent logic without waiting real seconds |
| **Global `metrics` singleton** | `reset_metrics` fixture zeros all counters | Prevents test pollution from shared mutable state |
| **File system** (for knowledge loading edge cases) | `tmp_path` fixture with invalid JSON files | Tests graceful degradation without modifying production data files |

### What Should Be Real

| Component | Reason |
|-----------|--------|
| **Knowledge JSON files** (`backend/knowledge/*.json`) | Tests must verify the actual production data files have correct schemas and content; using real files catches data rot |
| **Policy guard regex patterns** | Tests must verify the actual `BLOCKED_PATTERNS` list catches all expected inputs; mocking would make the tests meaningless |
| **Pydantic models** (`ChatRequest`, `ChatResponse`, `MetricsResponse`) | Tests must verify actual validation rules; Pydantic's runtime behavior is the specification |
| **FastAPI app** (via `ASGITransport`) | Integration tests must exercise the real middleware stack, routing, and dependency injection; mocking the framework defeats the purpose |
| **Token bucket algorithm** | Unit tests must verify the actual algorithm logic; the math is the specification |
| **Asyncio semaphore** | Concurrency tests must use real semaphore behavior to verify non-blocking rejection |
| **Metrics store** | Unit tests must verify real counter behavior and thread safety |

### Summary Table

| Layer | Mock? | Real? | Notes |
|-------|-------|-------|-------|
| OpenAI API | ✅ | ❌ | Always mock in CI; manual smoke test with real key |
| Knowledge files | ❌ | ✅ | Test actual data files |
| Policy patterns | ❌ | ✅ | Test actual regex list |
| Pydantic models | ❌ | ✅ | Test actual validation |
| FastAPI app | ❌ | ✅ | Test via `ASGITransport` |
| Rate limiter | ❌ | ✅ | Test actual algorithm |
| Concurrency limiter | ❌ | ✅ | Test actual semaphore |
| Metrics store | ❌ | ✅ | Test actual counters |
| Time (for refill/latency) | ✅ | ❌ | Mock via `monkeypatch` |
| File system (edge cases) | ✅ | ❌ | Mock via `tmp_path` |

### Guiding Principles

1. **Mock at the boundary, test the core.** The only external dependency is
   the OpenAI API — mock it.  Everything else is internal logic that should
   be tested with real implementations.

2. **Mock time, not algorithms.** When testing time-dependent behavior (token
   refill, latency buckets), mock `time.monotonic()` but use the real bucket
   or store logic.

3. **Use real data files for schema tests.** The knowledge JSON files are part
   of the deliverable.  Testing against mock data would miss schema drift in
   production files.

4. **Reset shared state between tests.** The `metrics` singleton and rate
   limiter state are global.  Use fixtures to reset them.

5. **Never mock the test subject.** If you're testing `is_blocked()`, use the
   real function with real patterns.  Mocking the function under test is a
   no-op.
