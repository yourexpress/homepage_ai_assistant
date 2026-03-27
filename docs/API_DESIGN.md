# API Design

This document lists the current backend endpoints and the behavior expected by
the frontend.

## Public Endpoints

### `POST /api/chat`

Purpose:

- send a visitor message to the assistant
- include current-session history
- optionally activate happy personality for a session with a valid token

Request body:

```json
{
  "message": "Tell me about the projects.",
  "history": [
    { "role": "user", "content": "Who is Runyu Ma?" },
    { "role": "assistant", "content": "..." }
  ],
  "session_id": "browser-session-id",
  "happy_token": "optional-signed-token"
}
```

Response:

```json
{
  "reply": "Assistant reply",
  "blocked": false,
  "happy_mode_active": false
}
```

Notes:

- `history` is capped by `MAX_HISTORY_MESSAGES`
- blocked requests still return `200` with `blocked: true`
- the backend only rate-limits and concurrency-limits `/api/chat`

### `GET /api/metrics`

Returns in-memory counters and latency buckets.

### `GET /api/content`

Returns the current homepage content plus capability flags used by the
frontend.

Response shape:

```json
{
  "content": { "...": "..." },
  "capabilities": {
    "happy_mode_enabled": true,
    "manager_enabled": true,
    "comments_enabled": true,
    "session_history_enabled": true
  }
}
```

### `GET /api/comments`

Query params:

- `sort=latest|likest`
- `page=1..n`

Returns 5 comments per page.

### `POST /api/comments`

Request body:

```json
{
  "author": "Visitor",
  "website_rating": 5,
  "resume_rating": 4,
  "body": "Clean design and clear profile story."
}
```

### `POST /api/comments/{comment_id}/vote`

Request body:

```json
{
  "direction": "up"
}
```

### `POST /api/happy/challenge`

Request body:

```json
{
  "code": "private-code",
  "session_id": "browser-session-id"
}
```

Success response:

```json
{
  "ok": true,
  "question": "Configured private question"
}
```

Failure response:

```json
{
  "ok": false,
  "message": "wrong answer"
}
```

### `POST /api/happy/verify`

Request body:

```json
{
  "code": "private-code",
  "answer": "private-answer",
  "session_id": "browser-session-id"
}
```

Success response returns a signed token.

### `GET /api/health`

Basic liveness check.

### `GET /api/readiness`

Readiness check for:

- knowledge base availability
- whether the OpenAI key is configured

## Protected Endpoints

These require header `X-Admin-Key: <ADMIN_API_KEY>`.

### `GET /api/admin/site-content`

Returns the current editable homepage content.

### `PUT /api/admin/site-content`

Request body:

```json
{
  "content": {
    "hero_title": {
      "en": "English text",
      "zh": "Chinese text"
    }
  }
}
```

Response includes:

- saved content
- translation sync notes

## Middleware Behavior

### Rate limiter

- applies only to `POST /api/chat`
- returns `429` with `Retry-After`

### Concurrency limiter

- applies only to `POST /api/chat`
- returns `503` with `Retry-After`

### CORS

- allowed origins come from `ALLOWED_ORIGINS`
- allowed headers include `Content-Type` and `X-Admin-Key`

## Error Model

- validation errors use FastAPI `422`
- blocked content uses `200` with `blocked: true`
- missing comment id on vote returns `404`
- invalid or missing admin key returns `401`
- manager feature disabled with no admin key configured returns `503`
