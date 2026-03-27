# Troubleshooting

Use this document for the most common current issues.

## Frontend Cannot Reach Backend

Symptoms:

- homepage loads but chat fails
- comments never load
- metrics page shows an error
- manager page cannot load content

Checks:

1. confirm the backend is running
2. confirm the frontend is using the expected backend URL from
   `frontend/js/app-config.js`
3. confirm `ALLOWED_ORIGINS` includes the frontend origin

## Manager Entrance Returns 401

Cause:

- missing or incorrect `X-Admin-Key`

Fix:

- set `ADMIN_API_KEY` on the backend
- use the same value in the manager page input

## Manager Entrance Returns 503

Cause:

- `ADMIN_API_KEY` is not configured on the backend

Fix:

- set `ADMIN_API_KEY` in `backend/.env`

## English and Chinese Did Not Sync

Checks:

1. confirm the edit went through the manager API, not manual file editing
2. confirm the backend had LLM access at save time
3. check the sync notes returned by the save response

## Comments Disappear After Restart

Cause:

- file-backed runtime data is not on persistent storage

Fix:

- mount `/app/data` to persistent storage in the container deployment

## Private Knowledge Did Not Load

Checks:

1. confirm real knowledge files exist under `/app/knowledge`
2. confirm JSON is valid
3. run `backend/scripts/validate_knowledge.py` against the files

## Happy Mode Always Says "wrong answer"

Checks:

1. confirm `HAPPY_MODE_ENABLED=true`
2. confirm the configured code, question, and answer values on the server
3. confirm you are not using placeholder values from `.env.example`

## Metrics Look Empty

Cause:

- metrics are in-memory only and reset on backend restart

Fix:

- verify the backend has processed chat requests since startup
- remember that current metrics are not persistent
