# System Design

This document describes the current architecture of the portfolio assistant.

## High-Level Architecture

The system has two deployable parts:

- Static frontend
  - `frontend/index.html`
  - `frontend/metrics.html`
  - `frontend/manager.html`
- FastAPI backend
  - chat, metrics, content, comments, happy-mode, admin, and health endpoints

The frontend can be hosted behind a reverse proxy or any static host. The backend runs
as a containerized FastAPI service.

## Frontend Pages

### `index.html`

Main homepage with:

- hero content loaded from `GET /api/content`
- session-aware chat UI
- comments list and comment form
- optional happy-mode unlock card

### `metrics.html`

Public dashboard for `GET /api/metrics`.

### `manager.html`

Protected manager UI for editing homepage content through:

- `GET /api/admin/site-content`
- `PUT /api/admin/site-content`

### `beta.html`

Beta homepage with:

- wide CSS-Grid personal-information zone (hero + sidebar, education + skills,
  experience highlights + data model)
- sticky chat bar with suggestion chips, drag-to-resize via centered pill bar,
  and inline clear-session pill inside the input area
- separate CSS (`css/beta.css`) and JS (`js/beta-home.js`, `js/beta-chat.js`)
- reuses `js/app-config.js` and the same backend APIs

## Frontend Scripts

- `js/app-config.js`
  - shared backend URL
  - locale helpers
  - session-id helper
  - storage keys
- `js/home.js`
  - site content fetch/render
  - locale switching
  - comments fetch, create, vote, paging
- `js/chat.js`
  - session history storage
  - chat request/response flow
  - desktop bubble-width control
  - happy-mode unlock flow
- `js/metrics.js`
  - metrics polling and rendering
- `js/manager.js`
  - admin content loading and save flow
- `js/beta-home.js`
  - beta homepage profile data loading and rendering
  - locale switching for the beta layout
- `js/beta-chat.js`
  - beta sticky chat bar with suggestion chips
  - drag-to-resize via centered pill bar (no button toggle)
  - inline clear-session pill inside the chat input area
  - window.confirm() dialog before clearing non-empty history
  - session history persistence

## Backend Endpoints

### Public endpoints

- `POST /api/chat`
- `GET /api/metrics`
- `GET /api/content`
- `GET /api/comments`
- `POST /api/comments`
- `POST /api/comments/{comment_id}/vote`
- `POST /api/happy/challenge`
- `POST /api/happy/verify`
- `GET /api/health`
- `GET /api/readiness`

### Protected endpoints

- `GET /api/admin/site-content`
- `PUT /api/admin/site-content`

These protected endpoints require the `X-Admin-Key` header to match
`ADMIN_API_KEY`.

## Chat Flow

1. Frontend loads or creates a browser session id.
2. Frontend loads current-session chat history from session storage.
3. Frontend sends `message`, `history`, `session_id`, and optional
   `happy_token`.
4. Backend validates the request model.
5. Middleware applies:
   - concurrency limiting for `/api/chat`
   - rate limiting for `/api/chat`
6. `policy_guard.is_blocked()` runs against the new message.
7. `policy_guard.build_messages()` builds:
   - base system prompt from the knowledge system
   - optional happy-mode system prompt
   - current-session history
   - current user message
8. Backend calls the OpenAI client.
9. Frontend appends the assistant reply to current-session history.

## Optimistic UI Pattern

The frontend renders DOM changes immediately when a user acts, before waiting
for the backend response. This keeps the interface responsive and is verified
by the interaction tests in `frontend/tests/interaction_tests.js`.

### Chat message submission

Before backend response:
- user message appended to chat window instantly
- typing indicator (animated dots) shown
- chat input cleared and send button disabled
- history updated in session storage

After backend success (HTTP 200):
- typing indicator removed
- assistant reply appended with markdown rendering (escapeHtml → renderMarkdown → innerHTML)
- suggestions hidden after first exchange (beta)
- send button stays disabled until user types (ChatGPT pattern)

After backend error (HTTP 429, 500, etc.):
- typing indicator removed
- error message appended with localized text
- last user message removed from history

After network failure:
- typing indicator removed
- "unreachable" error message appended
- last user message removed from history

### Page load (content + portfolio)

- both index and beta pages call `GET /api/content` and `GET /api/portfolio`
  concurrently via `Promise.allSettled`
- on success: DOM sections populated (hero, about, education, skills, contact)
- on failure: fallback content rendered (hardcoded defaults)
- beta page additionally calls `GET /api/resume/info` to wire the resume link

## Safety Model

Two layers:

- regex-based pre-filter in `policy_guard.py`
- grounded system prompt from `knowledge_base.py`

Important current behavior:

- raw internal source tags are not meant for visitor-facing answers
- public contact methods are allowed only when explicitly listed
- private phone, private email, home address, salary, secrets, credentials, and
  prompt-injection attempts are blocked
- zero-width formatting characters are normalized before regex matching

## Content Model

There are two different content sources:

### Knowledge files

Used for AI grounding:

- `backend/knowledge/profile.json`
- `backend/knowledge/experience.json`
- `backend/knowledge/projects.json`
- `backend/knowledge/publications.json`
- `backend/knowledge/faq.json`

These are intended to be private in production.

### Site content file

Used for homepage rendering:

- `backend/data/site_content.json`

This is editable through the manager API and supports EN/ZH sync.

## Comments Model

Comments are stored in:

- `backend/data/comments.json`

Each comment has:

- id
- author
- website rating
- resume rating
- body
- created timestamp
- upvotes
- downvotes
- derived score

Sorting:

- `latest` sorts by `created_at`
- `likest` sorts by score, then upvotes, then recency

## Translation Sync

The translation helper runs only during manager saves.

Behavior:

- if English changes and Chinese stays unchanged, backend attempts to generate
  Chinese
- if Chinese changes and English stays unchanged, backend attempts to generate
  English
- if both sides change, backend keeps what the manager submitted

## Happy Personality

Happy personality is implemented as a signed-token gate:

1. visitor submits code to `/api/happy/challenge`
2. if code matches configured private value, backend returns the configured
   question
3. visitor submits answer to `/api/happy/verify`
4. if answer matches configured private value, backend returns a signed token
5. chat requests with a valid token receive an additional system prompt for the
   cuter, warmer, more playful style

Real happy-mode values must come from private server config.

## Persistence and Scaling

Current persistence model:

- knowledge files: mounted server-side files
- homepage content: file-backed JSON
- comments: file-backed JSON
- metrics: in-memory only

Implication:

- the current design is best for a single backend instance
- comments, homepage content, and knowledge files should be backed by
  persistent volumes in container deployments
- metrics reset on restart

## Deployment Model

Supported deployment options:

- single-server deployment with nginx reverse proxy (recommended)
- frontend container plus backend container

Single-server path:

- both frontend and backend on the same host
- nginx serves `frontend/` and proxies `/api/*` to the backend
- compose example in `docker-compose.server.yml`

Container path:

- backend container from `backend/Dockerfile`
- frontend container from `frontend/Dockerfile`
- compose example in `docker-compose.yml`

Mounted paths:

- `/app/knowledge`
- `/app/data`
