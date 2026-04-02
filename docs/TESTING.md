# Testing Guide

This project has three useful levels of verification.

## 1. Static Checks

Use these when dependencies are limited but you still want quick confidence.

### Compile backend code

```bash
python -m compileall backend/app backend/tests
```

### Validate private knowledge files created from the templates

```bash
python backend/scripts/validate_knowledge.py \
  my-knowledge/profile.json \
  my-knowledge/experience.json \
  my-knowledge/projects.json \
  my-knowledge/publications.json \
  my-knowledge/faq.json
```

## 2. Backend Test Suite

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests -v
```

A clean-container run is also a good option when you do not want to install
Python dependencies on the host.

Key integration files:

- `test_chat.py`
- `test_metrics_api.py`
- `test_admin_api.py`
- `test_comments_api.py`
- `test_content_api.py`

## 3. Frontend Smoke Test

Open:

- `frontend/tests/smoke_tests.html`

This checks:

- main homepage elements exist
- compact feedback card exists
- chat bubble structure exists
- private-code dock exists

## 4. Frontend Interaction Tests

Open:

- `frontend/tests/interaction_tests.html`

Or run via Playwright CLI (requires `npm install playwright` and
`npx playwright install chromium`):

```bash
node /path/to/run_interaction_tests.js
```

These verify DOM state **before and after** backend responses by mocking
`fetch()` inside each iframe:

- user message appears immediately (optimistic UI)
- typing indicator shown while waiting, removed after response
- assistant reply rendered with markdown formatting
- error messages shown for HTTP errors and network failures
- minimize/expand toggle updates DOM classes
- send button follows ChatGPT pattern (disabled when input empty)

## Useful Manual Checks

### Manager flow

1. configure `ADMIN_API_KEY`
2. open `manager.html`
3. load content with the correct key
4. edit only English or only Chinese for a field
5. save and confirm sync notes are returned

### Manager profile overrides

1. load the dashboard with a valid admin key
2. scroll to the profile override sections (About, Education, Research, Contact)
3. enter values for name, headline, and add education/research/contact items
4. save and confirm the homepage shows the overrides instead of knowledge-base data
5. clear an override field and save — confirm the homepage falls back to the knowledge-base value
6. confirm pressing Enter in the admin key input triggers the dashboard load
7. refresh the manager page — confirm the admin key input is empty

### Chat session memory

1. ask an initial question
2. ask a follow-up that depends on the first answer
3. confirm the frontend preserved current-session history
4. close and reopen the chat bubble to confirm the session stays intact

### Feedback form

1. submit feedback with and without ratings
2. confirm the compact form stays usable on desktop and mobile widths
3. confirm no public comments pager appears on the homepage

### Happy personality

1. enable happy mode in server config
2. open the private-code dock from the lower-left bubble
3. submit the private code
4. confirm the follow-up question appears inside the main chat bubble
5. answer correctly and confirm chat responses return `happy_mode_active: true`
6. answer incorrectly and confirm the UI replies `wrong answer, thumb down`

## Dependency Note

If `pytest` or runtime dependencies are missing in the current environment,
compile and knowledge-validation checks are still worth running, but they are
not a substitute for the real integration suite.
