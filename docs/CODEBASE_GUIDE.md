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

### `frontend/beta.html`

Beta homepage. A recruiter-friendly redesign with:

- wide CSS Grid layout (hero + sidebar, education + skills side-by-side)
- profile hero card with name, headline, description, and CTA buttons
- bio summary and contact info cards in a right sidebar
- education and skills sections in a two-column row
- experience highlights section
- compact sticky chat bar at the bottom (suggestion chips + input)

### `frontend/js/beta-home.js`

Beta homepage orchestration:

- fetches `GET /api/content` and `GET /api/portfolio`
- renders profile hero, bio summary, contact info, education, skills, experience
- bilingual rendering with locale toggle
- admin-override priority: override > knowledge base > fallback defaults

### `frontend/js/beta-chat.js`

Beta chat bar orchestration:

- compact sticky bar with suggestion chips and input field
- session-aware history stored in sessionStorage
- calls `POST /api/chat`
- markdown rendering with XSS protection

### `frontend/css/beta.css`

Beta homepage styles:

- CSS Grid layout with responsive breakpoints
- low-saturation blue palette, uppercase card titles
- compact chat bar fixed to viewport bottom

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
