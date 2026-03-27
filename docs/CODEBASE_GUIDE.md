# Codebase Guide

This guide explains where the current behavior lives in the repository.

## Frontend

### `frontend/index.html`

Main homepage. It contains:

- language toggle
- hero content placeholders
- chat area
- happy-mode card
- comments form and list

### `frontend/js/app-config.js`

Shared frontend runtime config:

- backend URL selection
- locale storage
- session id creation
- storage keys

### `frontend/js/home.js`

Homepage orchestration:

- fetches `GET /api/content`
- renders bilingual hero copy
- fetches and renders comments
- posts comments and votes

### `frontend/js/chat.js`

Chat orchestration:

- reads and writes current-session history
- calls `POST /api/chat`
- enables desktop-only bubble-width control
- handles happy-mode unlock flow

### `frontend/js/manager.js`

Manager orchestration:

- loads editable content through protected admin endpoint
- renders editable EN/ZH fields
- saves content and displays auto-sync notes

## Backend

### `backend/app/main.py`

FastAPI assembly point:

- CORS
- rate limiter
- concurrency limiter
- router registration

### `backend/app/models.py`

Defines request/response schemas for:

- chat
- metrics
- site content
- comments
- happy mode

### `backend/app/api/`

- `chat.py`: session-aware chat endpoint
- `metrics.py`: operational metrics snapshot
- `content.py`: homepage content and capabilities
- `comments.py`: comment list/create/vote
- `happy.py`: happy-mode challenge and verify
- `admin.py`: protected site-content editing
- `health.py`: health and readiness

### `backend/app/services/knowledge_base.py`

Builds the core system prompt from knowledge files. Current important behavior:

- bilingual knowledge rendering
- no raw internal source tags in visitor-facing guidance
- public contacts rendered from approved knowledge

### `backend/app/services/policy_guard.py`

Current responsibilities:

- pre-filter blocked requests
- normalize hidden formatting characters before regex matching
- assemble final LLM message list
- append happy-mode prompt when a valid session token is present

### `backend/app/services/site_content_store.py`

File-backed homepage content for the public site and manager flow.

### `backend/app/services/translation_service.py`

Handles EN/ZH auto-sync during manager saves.

### `backend/app/services/comments_store.py`

File-backed comments store with score calculation and pagination support.

### `backend/app/services/happy_auth.py`

Implements:

- code verification
- question gating
- signed token issuance
- signed token validation

## Runtime Data

### `backend/data/site_content.json`

Editable homepage content.

### `backend/data/comments.json`

Visitor comments.

## If You Need To Extend Something

- add a new homepage section:
  update `site_content_store.py`, `manager.js`, `home.js`, and `index.html`
- change chat memory behavior:
  update `models.py`, `chat.py`, and `chat.js`
- replace file-backed comments with a database:
  start in `comments_store.py` and keep `comments.py` unchanged if possible
- harden or change happy mode:
  update `happy_auth.py`, `happy.py`, and the UI flow in `chat.js`
