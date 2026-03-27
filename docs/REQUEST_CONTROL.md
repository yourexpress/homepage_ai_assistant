# Request Control Model

This document describes the current request-control behavior of the backend.

## What Is Controlled

Only `POST /api/chat` is guarded by:

- rate limiting
- concurrency limiting

Other endpoints are not rate-limited today. Admin endpoints are protected by
`X-Admin-Key`, but they do not currently use the chat middleware controls.

## Identity for Rate Limiting

The backend derives a per-client key from the request IP address. This keeps
the system simple for a public site and avoids requiring visitor accounts.

## Rate Limiter

Implementation:

- `backend/app/middleware/rate_limiter.py`

Current model:

- token bucket
- default burst: `10`
- refill interval: `600` seconds per token

Behavior:

- applies only to `/api/chat`
- returns `429` with `Retry-After`
- increments `rate_limited_requests`

## Concurrency Limiter

Implementation:

- `backend/app/middleware/concurrency.py`

Current model:

- `asyncio.Semaphore`
- default max concurrent requests: `10`

Behavior:

- applies only to `/api/chat`
- returns `503` with `Retry-After`
- increments `concurrency_rejected_requests`

## Input Validation vs Request Control

Request control is separate from model validation:

- Pydantic validates shape and limits like `MAX_INPUT_LENGTH`
- request-control middleware manages overload and abuse
- `policy_guard.py` handles content-level blocking

## Session History Note

Chat is no longer fully stateless at the product level:

- the frontend now sends current-session history with each request
- the backend does not keep persistent chat transcripts server-side
- rate limiting still keys off client identity, not `session_id`

## Operational Note

Because the limiter state is in process memory, it resets when the backend
restarts.
