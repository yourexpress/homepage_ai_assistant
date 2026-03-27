# Portfolio AI Assistant

A production-minded portfolio project: a bilingual homepage with a grounded AI
assistant, a compact visitor feedback flow, a protected manager entrance, and an
optional private happy-mode unlock.

The frontend is static and can be hosted on GitHub Pages or any static host.
The backend is a FastAPI service designed to run in a container.

## Features

- session-aware portfolio chat with a compact, resizable desktop bubble
- bilingual English and Chinese homepage content
- compact feedback form without a public comments feed
- protected manager entrance for homepage editing
- automatic EN/ZH sync when content is edited through the manager flow
- protected owner-only comments inbox
- optional happy-personality mode unlocked from a small private-code dock
- container deployment scaffolding

## Repository Structure

```text
frontend/
  index.html
  comments-reader.html
  metrics.html
  manager.html
  css/style.css
  js/app-config.js
  js/comments-reader.js
  js/home.js
  js/chat.js
  js/metrics.js
  js/manager.js

backend/
  Dockerfile
  .env.example
  app/
    main.py
    config.py
    models.py
    api/
      chat.py
      metrics.py
      content.py
      comments.py
      happy.py
      admin.py
      health.py
    middleware/
      rate_limiter.py
      concurrency.py
    services/
      knowledge_base.py
      policy_guard.py
      llm_client.py
      metrics_store.py
      site_content_store.py
      comments_store.py
      translation_service.py
      happy_auth.py
  knowledge/
    templates/
  data/
```

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Create your private runtime knowledge files from the templates in
`backend/knowledge/templates/`. The repository intentionally does not ship real
`backend/knowledge/*.json` data.

### Frontend

Open `frontend/index.html` in a browser, or host `frontend/` on a static site
platform. Frontend runtime configuration lives in `frontend/js/app-config.js`.

### Containers

```bash
docker compose up --build
```

## Deployment

Recommended deployment is:

- GitHub Pages or another static host for `frontend/`
- backend container from `backend/Dockerfile`
- persistent mounted storage for:
  - `backend/knowledge`
  - `backend/data`

For GitHub Pages with a custom domain such as `www.runyuma.uk`, see
[docs/GITHUB_PAGES_DEPLOYMENT.md](docs/GITHUB_PAGES_DEPLOYMENT.md).

For container-based hosting of both frontend and backend, see
[docs/CONTAINER_DEPLOYMENT.md](docs/CONTAINER_DEPLOYMENT.md).

## Important Configuration

Set these in `backend/.env`:

- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS`
- `ADMIN_API_KEY`
- `SITE_CONTENT_FILE`
- `COMMENTS_FILE`
- `HAPPY_MODE_ENABLED`
- `HAPPY_MODE_ACCESS_CODE`
- `HAPPY_MODE_QUESTION`
- `HAPPY_MODE_EXPECTED_ANSWER`
- `HAPPY_MODE_SECRET`
- `HAPPY_MODE_VISITOR_NAME_EN`
- `HAPPY_MODE_VISITOR_NAME_ZH`

Real production knowledge files and happy-mode secrets should stay off the
public repository.

`HAPPY_MODE_SECRET` is not the unlock code itself. It is the private signing key
used to create and verify the session-bound happy-mode token after a visitor
unlocks that mode successfully.

The homepage reads profile basics such as introduction, research interests,
education, and public contacts from the runtime knowledge files when they are
present. The contact card prefers email, LinkedIn, and GitHub values when those
public links are provided.

## Documentation

- [Product Requirements](docs/REQUIREMENTS.md)
- [System Design](docs/SYSTEM_DESIGN.md)
- [API Design](docs/API_DESIGN.md)
- [Knowledge System](docs/KNOWLEDGE_SYSTEM.md)
- [Knowledge Templates Guide](docs/KNOWLEDGE_TEMPLATES.md)
- [Safety Policy](docs/SAFETY_POLICY.md)
- [Container Deployment](docs/CONTAINER_DEPLOYMENT.md)
- [GitHub Pages Deployment](docs/GITHUB_PAGES_DEPLOYMENT.md)
- [Testing Guide](docs/TESTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## License

Apache 2.0. See [LICENSE](LICENSE).
