# Developer Reading Guide

This guide points you to the fastest path for understanding the current
portfolio assistant implementation.

## Start Here

1. `README.md`
   Use this first for setup, deployment, and the feature summary.
2. `docs/SYSTEM_DESIGN.md`
   Read this next for the current architecture: pages, APIs, storage, and
   deployment model.
3. `docs/API_DESIGN.md`
   Use this for endpoint-level behavior and request/response contracts.
4. `docs/KNOWLEDGE_SYSTEM.md`
   Read this before changing prompt, knowledge loading, or bilingual content.
5. `docs/SAFETY_POLICY.md`
   Read this before adjusting prompt-injection or privacy behavior.
6. `docs/TEST_PLAN.md` and `docs/TESTING.md`
   Use these when changing backend logic, UI wiring, or deployment behavior.

## Fast Repo Map

```text
frontend/
  index.html          Main homepage: hero, chat, comments
  metrics.html        Public metrics dashboard
  manager.html        Protected manager entrance
  css/style.css       Shared site styling
  js/app-config.js    Shared frontend config + locale/session helpers
  js/home.js          Homepage content + comments UI
  js/chat.js          Session-aware chat + happy mode UI
  js/metrics.js       Metrics polling UI
  js/manager.js       Manager editor UI

backend/
  app/main.py         FastAPI app factory and router wiring
  app/config.py       Environment-backed settings
  app/models.py       Request/response models
  app/api/chat.py     POST /api/chat
  app/api/metrics.py  GET /api/metrics
  app/api/content.py  GET /api/content
  app/api/comments.py GET/POST comments + voting
  app/api/happy.py    Happy-mode challenge + verify
  app/api/admin.py    Protected site-content editing
  app/api/health.py   Health and readiness checks
  app/services/
    knowledge_base.py      Prompt and knowledge assembly
    policy_guard.py        Pre-filter + prompt message construction
    llm_client.py          OpenAI wrapper
    metrics_store.py       In-memory counters
    site_content_store.py  File-backed homepage content
    comments_store.py      File-backed visitor comments
    translation_service.py EN/ZH auto-sync helper
    happy_auth.py          Signed token helper for happy mode
  data/
    site_content.json     Runtime homepage content
    comments.json         Runtime comments store
```

## If You Are Changing...

- Chat behavior:
  read `backend/app/api/chat.py`, `backend/app/models.py`,
  `backend/app/services/policy_guard.py`, and `frontend/js/chat.js`
- Homepage copy and bilingual sync:
  read `backend/app/api/admin.py`, `backend/app/services/site_content_store.py`,
  `backend/app/services/translation_service.py`, and `frontend/js/manager.js`
- Comments:
  read `backend/app/api/comments.py`, `backend/app/services/comments_store.py`,
  and `frontend/js/home.js`
- Prompt and knowledge behavior:
  read `backend/app/services/knowledge_base.py`,
  `backend/app/services/policy_guard.py`, and `docs/KNOWLEDGE_SYSTEM.md`
- Deployment:
  read `.github/workflows/pages.yml`, `docker-compose.yml`,
  `backend/Dockerfile`, `frontend/Dockerfile`,
  `docs/GITHUB_PAGES_DEPLOYMENT.md`, and `docs/CONTAINER_DEPLOYMENT.md`

## Important Current Assumptions

- The frontend is static and can be hosted behind a reverse proxy or any static host.
- The backend is a single FastAPI service.
- Editable site content and comments are file-backed, so single-instance
  backend deployment is the intended production model right now.
- Real knowledge files and happy-mode secrets should stay on the server and out
  of the public repository.
