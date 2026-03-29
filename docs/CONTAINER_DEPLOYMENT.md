# Container Deployment

This project can run as two containers:

- `backend`: FastAPI API on port `8000`
- `frontend`: static site served by nginx on port `8080`

If you want to host the frontend on GitHub Pages instead, see
`docs/GITHUB_PAGES_DEPLOYMENT.md`.

If you want the whole site to be hosted from your own server under one domain,
see `docs/SERVER_DEPLOYMENT.md`. That is the recommended deployment path for
the current product shape.

## Why this setup

- real knowledge files stay on the server instead of the public repository
- editable homepage content and visitor feedback persist in mounted volumes
- the manager entrance writes to server-side storage without rebuilding the image

## Files used

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `backend/.env`

## 1. Prepare the backend environment

Create `backend/.env` from `backend/.env.example` and set at least:

- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS=http://localhost:8080,https://your-frontend-domain`
- `ADMIN_API_KEY`
- `HAPPY_MODE_ENABLED=true` only when you are ready
- `HAPPY_MODE_ACCESS_CODE`
- `HAPPY_MODE_QUESTION`
- `HAPPY_MODE_EXPECTED_ANSWER`
- `HAPPY_MODE_SECRET`
- `HAPPY_MODE_VISITOR_NAME_EN`
- `HAPPY_MODE_VISITOR_NAME_ZH`

Do not commit the real values.

## 2. Prepare private knowledge files

Start from the templates in `backend/knowledge/templates/`, fill in your own
public information, and validate the completed files locally.

Your completed runtime files should be mounted into:

- `/app/knowledge/profile.json`
- `/app/knowledge/experience.json`
- `/app/knowledge/projects.json`
- `/app/knowledge/publications.json`
- `/app/knowledge/faq.json`

In local compose, those map from `./backend/knowledge`.

## 3. Persistence

These paths should be mounted to persistent storage:

- `/app/knowledge` for private runtime knowledge
- `/app/data/site_content.json` for manager-edited homepage content
- `/app/data/comments.json` for visitor feedback

Without a persistent volume, manager edits and feedback are lost when the
container is recreated.

## 4. Start locally with Compose

```bash
docker compose up --build
```

Then open:

- frontend: `http://localhost:8080`
- backend API: `http://localhost:8000/api/health`

For production-style same-host deployment, use:

```bash
docker compose -f docker-compose.server.yml up -d --build
```

## 5. Production notes

- This implementation uses file-backed feedback and content storage, so it is
  best suited to a single backend instance.
- If you later scale to multiple backend replicas, move feedback and editable
  content to a shared database or object store.
- The EN/ZH auto-sync runs when content is edited through the manager API.
  Manual file edits outside that flow will not trigger translation sync.
