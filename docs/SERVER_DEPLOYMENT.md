# Server Deployment

This is the recommended deployment model when you want `www.runyuma.uk` to be
served from your own server instead of GitHub Pages.

It is a better fit for this project because:

- the public frontend and FastAPI backend live on the same host
- `/api/*` stays behind your own reverse proxy
- `manager.html` and `comments-reader.html` are no longer tied to Pages cache
- private knowledge files and manager-edited content remain on the server

## Files used

- `docker-compose.server.yml`
- `deploy/nginx/server.conf`
- `backend/Dockerfile`
- `frontend/`
- `backend/.env`

## Host model

The server deployment runs two containers:

- `web`: nginx serving `frontend/` and proxying `/api/*` to the backend
- `backend`: FastAPI on the internal Docker network

Public traffic hits only nginx on port `80`. The backend is not exposed
directly.

## 1. Prepare the server

Install Docker and Docker Compose on the server, then copy the repository onto
the machine.

Your runtime server should have:

- the repository checkout
- `backend/.env`
- completed private knowledge files in `backend/knowledge/`
- writable persistent storage in `backend/data/`

## 2. Configure backend environment

Create `backend/.env` from `backend/.env.example`.

At minimum set:

- `OPENAI_API_KEY`
- `ADMIN_API_KEY`
- `ALLOWED_ORIGINS=https://www.runyuma.uk,https://runyuma.uk`
- `SITE_CONTENT_FILE=data/site_content.json`
- `COMMENTS_FILE=data/comments.json`

If you use happy mode, also set the happy-mode secrets.

## 3. DNS

Point your domain to the server instead of GitHub Pages.

Recommended setup:

- `www.runyuma.uk` -> your server public IP
- `runyuma.uk` -> same server or redirect to `https://www.runyuma.uk`

If you currently have GitHub Pages DNS records for `www`, remove or replace
them so traffic stops going to GitHub.

## 4. Start the site

From the repository root:

```bash
docker compose -f docker-compose.server.yml up -d --build
```

If your server uses the older standalone Compose binary, use:

```bash
docker-compose -f docker-compose.server.yml up -d --build
```

That publishes:

- `http://your-server/`
- `http://your-server/api/health`

On your real domain, nginx will serve:

- `https://www.runyuma.uk/`
- `https://www.runyuma.uk/manager.html`
- `https://www.runyuma.uk/comments-reader.html`
- `https://www.runyuma.uk/api/*`

## 5. HTTPS

The included nginx config listens on port `80` only.

Use one of these production approaches:

- put this stack behind an existing TLS terminator on the server
- add a separate reverse proxy such as Caddy, Traefik, or certbot-managed nginx
- extend `deploy/nginx/server.conf` with your certificate paths

## 6. Manager-page behavior

`frontend/js/app-config.js` now treats `runyuma.uk` and `www.runyuma.uk` as
same-origin deployments. That means the frontend calls `/api/*` on the same
site instead of trying to reach `https://api.runyuma.uk`.

This removes the extra cross-origin dependency when the whole site is hosted on
your server.

## 7. Recommended hardening

For owner-only pages such as `manager.html` and `comments-reader.html`, server
deployment gives you better options than GitHub Pages:

- restrict them by VPN, IP allowlist, or reverse-proxy basic auth
- keep `ADMIN_API_KEY` out of any public demo workflows
- disable directory indexing and keep these pages out of search engines

The provided nginx config already adds `X-Robots-Tag: noindex, nofollow` and
`Cache-Control: no-store` on those two owner pages.

## 8. Updating the site

After code changes:

```bash
docker compose -f docker-compose.server.yml up -d --build
```

Older Docker setups may require:

```bash
docker-compose -f docker-compose.server.yml up -d --build
```

Because nginx serves the checked-out `frontend/` directory directly, static
page updates no longer depend on GitHub Pages rebuilds.
