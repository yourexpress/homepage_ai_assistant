# Knowledge Templates — Offline Editing Guide

This guide explains how to generate personalized knowledge files for the AI
portfolio assistant without touching the server.  You fill in the templates on
your own machine, validate them locally, and then upload the completed files to
the server.

---

## Why This Workflow Exists

The five knowledge files in `backend/knowledge/` are the only source of truth
for the AI assistant.  They must contain **only your public professional
information** — never private contact details.  By editing offline and
validating before deploying, you can:

- Review every piece of information before the assistant can use it.
- Catch schema errors before they silently break the assistant.
- Keep the repository free of personal data while still using version control.

---

## Step 1 — Copy the Templates

The templates live in `backend/knowledge/templates/`.  Copy them to a local
working directory:

```bash
cp backend/knowledge/templates/profile_template.json      my-knowledge/profile.json
cp backend/knowledge/templates/experience_template.json   my-knowledge/experience.json
cp backend/knowledge/templates/projects_template.json     my-knowledge/projects.json
cp backend/knowledge/templates/publications_template.json my-knowledge/publications.json
cp backend/knowledge/templates/faq_template.json          my-knowledge/faq.json
```

You can also download the templates directly from the repository's web
interface if you do not have a local clone.

---

## Step 2 — Fill in Your Information

Open each file in any text editor and replace every placeholder with your real
public information.

### `profile.json`

Key fields to fill in:

```json
{
  "name": "Your Full Name",
  "headline": "Your Professional Headline",
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "Your University",
      "year": 2024
    }
  ],
  "location_public": "Your City, Country",
  "links": {
    "github": "https://github.com/your-username",
    "portfolio": "https://your-username.github.io"
  },
  "research_interests": ["Topic A", "Topic B"],
  "skills": ["Python", "Docker", "Your skills here"]
}
```

### `experience.json`

Add one object per role.  Set `end_year` to `null` for your current position:

```json
{
  "positions": [
    {
      "title": "Software Engineer",
      "organization": "Company Name",
      "start_year": 2022,
      "end_year": null,
      "focus": "Backend infrastructure",
      "description": "Brief description of what you did."
    }
  ]
}
```

### `projects.json`

Add one object per public project:

```json
{
  "projects": [
    {
      "name": "My Project",
      "description": "What the project does and why.",
      "url": "https://github.com/your-username/my-project",
      "technologies": ["Python", "FastAPI"],
      "status": "active"
    }
  ]
}
```

### `publications.json`

Add one object per paper or article.  If you have no publications, use the
empty form:

```json
{ "publications": [] }
```

Otherwise:

```json
{
  "publications": [
    {
      "title": "Paper Title",
      "year": 2024,
      "venue": "NeurIPS / ArXiv / Journal Name",
      "url": "https://arxiv.org/abs/xxxx.xxxxx"
    }
  ]
}
```

### `faq.json`

Write Q&A pairs in your own voice.  The assistant will use these answers
verbatim when a visitor asks a matching question:

```json
{
  "entries": [
    {
      "question": "What do you do?",
      "answer": "I'm a software engineer specialising in..."
    }
  ]
}
```

---

## Step 3 — Validate Locally

Run the provided validator script before uploading.  It checks JSON syntax,
required fields, value types, and scans for private-data patterns:

```bash
# From the repository root
python backend/scripts/validate_knowledge.py \
    my-knowledge/profile.json \
    my-knowledge/experience.json \
    my-knowledge/projects.json \
    my-knowledge/publications.json \
    my-knowledge/faq.json
```

Example output when all files are valid:

```
✅  my-knowledge/profile.json
✅  my-knowledge/experience.json
✅  my-knowledge/projects.json
✅  my-knowledge/publications.json
✅  my-knowledge/faq.json

All files are valid.
```

Example output when a file has errors:

```
❌  my-knowledge/profile.json
    my-knowledge/profile.json: missing required key 'name'
    my-knowledge/profile.json: key 'education' must be list, got str

Validation failed. Fix the errors above before deploying.
```

The script exits with code `0` on success and `1` on failure, so you can use
it in a shell pipeline or CI check:

```bash
python backend/scripts/validate_knowledge.py my-knowledge/*.json && echo "Ready to deploy"
```

---

## Step 4 — Upload to the Server

Copy the completed files to your server using `scp` or any file-transfer tool
you prefer:

```bash
scp my-knowledge/profile.json      user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp my-knowledge/experience.json   user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp my-knowledge/projects.json     user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp my-knowledge/publications.json user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp my-knowledge/faq.json          user@your-server:~/homepage_ai_assistant/backend/knowledge/
```

---

## Step 5 — Rebuild and Restart the Container

The knowledge files are baked into the Docker image at build time, so a
rebuild is required after any change:

```bash
ssh user@your-server
cd ~/homepage_ai_assistant

sudo docker stop homepage-ai-backend && sudo docker rm homepage-ai-backend
sudo docker build -t homepage-ai-backend ./backend
sudo docker run -d \
  --name homepage-ai-backend \
  -p 8000:8000 \
  --env-file backend/.env \
  --restart unless-stopped \
  homepage-ai-backend
```

---

## Step 6 — Verify

Test that the assistant is responding with your information:

```bash
curl -s -X POST https://your-api-domain/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Who are you?"}' | python3 -m json.tool
```

The `reply` field should contain text that references your name and background.

---

## Privacy Checklist

Before uploading, confirm that your files contain **none** of the following:

- [ ] Home or mailing address
- [ ] Personal phone number
- [ ] Personal email address (`@gmail.com`, `@yahoo.com`, etc.)
- [ ] Salary or compensation information
- [ ] Details about other private individuals

The validator will flag common patterns, but it is not exhaustive — review
your files manually as a final check.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Assistant still says "Alex Chen" | Old Docker image | Rebuild with `docker build` |
| Validator reports missing key | Placeholder not replaced | Open the file and fill in the field |
| `JSONDecodeError` | Syntax error in the file | Check for trailing commas or missing quotes |
| `end_year` type error | Used `"null"` (string) instead of `null` (JSON) | Remove the quotes |
| Private-data warning | Personal email or phone in file | Remove it — use public links instead |

---

## Schema Reference

For the complete field-by-field schema for each file, see
[`backend/knowledge/templates/README.md`](../backend/knowledge/templates/README.md).
