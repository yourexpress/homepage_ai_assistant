# Testing Guide

This project now has three different levels of verification.

## 1. Static Checks

Use these when dependencies are limited but you still want quick confidence.

### Compile backend code

```bash
python -m compileall backend/app backend/tests
```

### Validate knowledge files

```bash
python backend/scripts/validate_knowledge.py \
  backend/knowledge/profile.json \
  backend/knowledge/experience.json \
  backend/knowledge/projects.json \
  backend/knowledge/publications.json \
  backend/knowledge/faq.json
```

## 2. Backend Test Suite

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests -v
```

Key integration files:

- `test_chat.py`
- `test_metrics_api.py`
- `test_admin_api.py`
- `test_comments_api.py`

## 3. Frontend Smoke Test

Open:

- `frontend/tests/smoke_tests.html`

This checks:

- main homepage elements exist
- manager link exists
- comments controls exist
- chat structure exists

## Useful Manual Checks

### Manager flow

1. configure `ADMIN_API_KEY`
2. open `manager.html`
3. load content with the correct key
4. edit only English or only Chinese for a field
5. save and confirm sync notes are returned

### Chat session memory

1. ask an initial question
2. ask a follow-up that depends on the first answer
3. confirm the frontend preserved current-session history

### Comments

1. post multiple comments
2. switch sort between `latest` and `likest`
3. vote on comments
4. confirm 5-per-page pagination

### Happy personality

1. enable happy mode in server config
2. submit the private code
3. answer the configured question correctly
4. confirm chat responses return `happy_mode_active: true`

## Dependency Note

If `pytest` or runtime dependencies are missing in the current environment,
compile and knowledge-validation checks are still worth running, but they are
not a substitute for the real integration suite.
