# GitHub Pages Deployment (Legacy)

> **Note:** This project is now hosted on AWS EC2 using the server deployment
> model described in [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md). The
> instructions below are kept for historical reference but are no longer the
> active deployment path. The GitHub Pages workflow has been removed.

This repository previously published the static frontend from `frontend/`
directly to GitHub Pages.

Recommended public setup:

- frontend: `https://www.runyuma.uk`
- backend API: `https://api.runyuma.uk`

GitHub Pages only serves the frontend. The FastAPI backend still needs to run
separately in a container or on another backend host.

## Files used

- `.github/workflows/pages.yml`
- `frontend/`
- `frontend/js/app-config.js`

## 1. Enable GitHub Pages for this repository

In the `yourexpress/homepage_ai_assistant` repository:

1. Go to `Settings` -> `Pages`.
2. Under `Build and deployment`, set `Source` to `GitHub Actions`.
3. Merge or push the Pages workflow in `.github/workflows/pages.yml`.
4. After the workflow runs on `main`, GitHub will publish the contents of
   `frontend/`.

This workflow copies `frontend/` into the Pages artifact and deploys it without
running Jekyll.

## 2. Configure the custom domain

Use `www.runyuma.uk` as the custom domain in the repository Pages settings.

1. Open `Settings` -> `Pages`.
2. In `Custom domain`, enter `www.runyuma.uk` and save.
3. Wait for GitHub to finish checking DNS and provisioning HTTPS.

When GitHub Pages is published from a custom GitHub Actions workflow, GitHub
uses the repository Pages settings for the custom domain.

## 3. Add DNS records at your domain provider

For `www.runyuma.uk`:

- create a `CNAME` record for `www`
- point it to `yourexpress.github.io`

For the apex domain `runyuma.uk`, use one of these strategies:

- preferred: add the GitHub Pages apex records too, so GitHub can redirect
  `runyuma.uk` to `www.runyuma.uk`
- or: configure an HTTP redirect at your domain provider from `runyuma.uk` to
  `https://www.runyuma.uk`

If you use GitHub Pages for the apex as well, add these `A` records:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

Optional IPv6 `AAAA` records:

- `2606:50c0:8000::153`
- `2606:50c0:8001::153`
- `2606:50c0:8002::153`
- `2606:50c0:8003::153`

## 4. Keep the backend reachable from the frontend

`frontend/js/app-config.js` now resolves the backend in this order:

- the optional `meta[name="portfolio-backend-url"]` override in the page
- the optional `window.PORTFOLIO_CONFIG.BACKEND_URL` runtime override
- `http://localhost:8000` for local development
- `https://api.runyuma.uk` for `runyuma.uk`, `www.runyuma.uk`, and `github.io` deployments

That means the frontend can move to `www.runyuma.uk` without additional runtime
changes, as long as:

- `api.runyuma.uk` points to your backend host
- backend `ALLOWED_ORIGINS` includes `https://www.runyuma.uk`

The frontend also accepts `?lang=en` and `?lang=zh`, which is useful for
redirecting old English and Chinese Pages entry points.

## 5. Backend configuration reminder

In `backend/.env`, make sure:

- `ALLOWED_ORIGINS` includes `https://www.runyuma.uk`
- `OPENAI_API_KEY` is set
- your manager and happy-mode secrets are set
- your private knowledge files are present on the backend server

## 6. Redirect the legacy `rym-rym.github.io` site

If you want visitors from the legacy GitHub Pages site to land on the new
frontend, keep the old repository as a tiny redirect-only site.

For the old root page, use a simple `index.html` like:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=https://www.runyuma.uk/?lang=en" />
  <link rel="canonical" href="https://www.runyuma.uk/?lang=en" />
  <script>
    window.location.replace("https://www.runyuma.uk/?lang=en");
  </script>
  <title>Redirecting to www.runyuma.uk</title>
</head>
<body>
  <p>Redirecting to <a href="https://www.runyuma.uk/?lang=en">www.runyuma.uk</a>.</p>
</body>
</html>
```

If the old repository also has a `/zh/` path, add `zh/index.html` that points
to `https://www.runyuma.uk/?lang=zh`.

This is a redirect, so the browser URL will change from `rym-rym.github.io` to
`www.runyuma.uk`.

## 7. Release flow

Suggested release flow:

1. Merge frontend changes into `main`.
2. GitHub Actions deploys the frontend to GitHub Pages automatically.
3. Deploy the backend container separately.
4. Verify:
   - `https://www.runyuma.uk`
   - `https://api.runyuma.uk/api/health`
   - manager access from `https://www.runyuma.uk/manager.html`

## 8. Important limitation

Moving frontend hosting to GitHub Pages does not move backend hosting there.
GitHub Pages is static hosting only.
