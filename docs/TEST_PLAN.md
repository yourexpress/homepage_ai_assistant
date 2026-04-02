# Test Plan

This document describes the current intended coverage areas.

## Backend Unit Coverage

- `test_models.py`
  - request and response schema contracts
  - history limits
  - happy-mode response flag
- `test_policy_guard.py`
  - blocked and allowed patterns
  - public/private contact distinctions
  - prompt-building behavior
- `test_metrics.py`
  - in-memory metric accumulation
- `test_rate_limiter.py`
  - token bucket behavior
- `test_concurrency.py`
  - semaphore behavior
- `test_knowledge_base.py`
  - knowledge loading
  - prompt assembly
  - no raw source tags
- `test_validate_knowledge.py`
  - knowledge validator behavior

## Backend Integration Coverage

- `test_chat.py`
  - happy path
  - blocked request path
  - session history forwarding
  - happy-mode response flag
- `test_metrics_api.py`
  - metrics shape and counter reflection
- `test_admin_api.py`
  - protected site-content load/save
  - profile override fields stored and returned
  - happy challenge and verify flow
- `test_comments_api.py`
  - create
  - list
  - vote
- `test_health.py`
  - health and readiness

## Frontend Smoke Coverage

- `frontend/tests/smoke_tests.html`
- `frontend/tests/smoke_tests.js`

These check only static DOM structure and basic page wiring. They do not
replace browser automation or full end-to-end tests. Manager page smoke tests
verify that the profile override sections (About, Education, Research, Contact)
are present in the DOM. Beta page smoke tests verify the personal-information
zone cards, sticky chat bar elements, pill-bar drag resize handle, and that
the resize toggle button is absent (drag-only resize).

## Frontend Interaction Coverage

- `frontend/tests/interaction_tests.html`
- `frontend/tests/interaction_tests.js`

These tests verify that the front-end DOM is rendered correctly **before and
after** the backend acts on user interactions. They mock `fetch()` inside
iframes to simulate backend responses without a running server.

### Beta chat interactions

- optimistic UI: user message appears immediately, typing indicator shown,
  input cleared, send button disabled while waiting
- success response: assistant message rendered with markdown, typing indicator
  removed, send button follows ChatGPT pattern (disabled until input present)
- error handling: error message on 429 (rate limited) and network failure
- minimize/expand toggle: DOM class `is-minimized` added and removed
- suggestion chips: data-question attributes present on buttons

### Index chat interactions

- optimistic UI: user message appears immediately, input cleared
- success response: assistant message rendered with markdown
- error handling: error message on 500 and network failure

## Lightweight Validation Commands

Backend static verification:

```bash
python -m compileall backend/app backend/tests
```

Knowledge validation:

```bash
python backend/scripts/validate_knowledge.py \
  backend/knowledge/profile.json \
  backend/knowledge/experience.json \
  backend/knowledge/projects.json \
  backend/knowledge/publications.json \
  backend/knowledge/faq.json
```

Full backend tests:

```bash
cd backend
pytest tests -v
```
