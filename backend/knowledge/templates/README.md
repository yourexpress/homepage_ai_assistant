# Knowledge File Templates

This directory contains template JSON files for the five knowledge files that
power the AI portfolio assistant. Fill in the templates with your own public
information, then copy the completed files to `backend/knowledge/` on your
server.

---

## Quick Start

1. Copy the template you need from this directory to a local folder.
2. Fill in every placeholder value with your real public information.
3. Validate the files with the CLI validator (see below).
4. Upload the completed files to `backend/knowledge/` on your server.
5. Rebuild the Docker image so the new files are baked in.

---

## File Descriptions and Schemas

### `profile_template.json` → `profile.json`

Top-level personal profile — loaded first into the system prompt.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Your full public name |
| `headline` | string | ✅ | Short professional headline |
| `education` | array | ✅ | List of education entries (see below) |
| `location_public` | string | — | General location only — never a street address |
| `links` | object | — | Map of label → URL for public links |
| `research_interests` | array of string | — | Topics you research or study |
| `skills` | array of string | ✅ | Your technical skills |

**Education entry fields:**

| Field | Type | Required |
|---|---|---|
| `degree` | string | ✅ |
| `institution` | string | ✅ |
| `year` | integer | ✅ |

---

### `experience_template.json` → `experience.json`

Work or research positions.

| Field | Type | Required | Description |
|---|---|---|---|
| `positions` | array | ✅ | List of position entries (see below) |

**Position entry fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | ✅ | Job or role title |
| `organization` | string | ✅ | Employer or institution name |
| `start_year` | integer | ✅ | Year you started |
| `end_year` | integer or null | — | Year you finished; `null` means current |
| `focus` | string | — | One-line focus area |
| `description` | string | — | Short description of responsibilities |

---

### `projects_template.json` → `projects.json`

Public projects you want the AI to know about.

| Field | Type | Required | Description |
|---|---|---|---|
| `projects` | array | ✅ | List of project entries (see below) |

**Project entry fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Project name |
| `description` | string | ✅ | What the project does |
| `url` | string | — | Public URL (GitHub, demo, etc.) |
| `technologies` | array of string | — | Languages and tools used |
| `status` | string | — | `"active"`, `"completed"`, or `"archived"` |

---

### `publications_template.json` → `publications.json`

Papers, articles, or other research output. Use an empty `publications` list
if you have none:

```json
{ "publications": [] }
```

| Field | Type | Required | Description |
|---|---|---|---|
| `publications` | array | ✅ | List of publication entries (see below) |

**Publication entry fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | ✅ | Paper or article title |
| `year` | integer | ✅ | Publication year |
| `venue` | string | — | Conference, journal, or "ArXiv" |
| `url` | string | — | Link to the paper |

---

### `faq_template.json` → `faq.json`

Pre-approved question and answer pairs. These are injected verbatim, so write
answers in the voice you want the assistant to use.

| Field | Type | Required | Description |
|---|---|---|---|
| `entries` | array | ✅ | List of Q&A entries (see below) |

**FAQ entry fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | ✅ | A question a visitor might ask |
| `answer` | string | ✅ | The approved answer |

---

## Privacy Rules

> **Never commit personal contact details to this repository.**

The following information must **never** appear in these files:

- Home or mailing address
- Personal phone numbers
- Personal email addresses (`@gmail.com`, `@yahoo.com`, etc.)
- Salary or compensation details
- Any information about other private individuals

Public professional links (GitHub, LinkedIn, portfolio URL) are safe to include.

---

## Validating Your Files

Use the CLI validator in `backend/scripts/validate_knowledge.py` to check your
files before deployment:

```bash
# Validate all five files at once
python backend/scripts/validate_knowledge.py \
    backend/knowledge/profile.json \
    backend/knowledge/experience.json \
    backend/knowledge/projects.json \
    backend/knowledge/publications.json \
    backend/knowledge/faq.json

# Validate a single file
python backend/scripts/validate_knowledge.py backend/knowledge/profile.json
```

The validator checks:

- The file is valid JSON.
- The top-level structure is a JSON object (not an array or primitive).
- Required top-level keys are present.
- Required keys inside nested entries are present.
- Values are the expected types (string, integer, list, etc.).

Exit code is `0` on success and `1` if any file has errors.

---

## Uploading to Your Server

After filling in the templates and passing validation:

```bash
# Copy files to the server (adjust host/path as needed)
scp backend/knowledge/profile.json user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp backend/knowledge/experience.json user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp backend/knowledge/projects.json user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp backend/knowledge/publications.json user@your-server:~/homepage_ai_assistant/backend/knowledge/
scp backend/knowledge/faq.json user@your-server:~/homepage_ai_assistant/backend/knowledge/

# Rebuild and restart the Docker container so the new files are baked in
sudo docker stop homepage-ai-backend && sudo docker rm homepage-ai-backend
sudo docker build -t homepage-ai-backend ./backend
sudo docker run -d \
  --name homepage-ai-backend \
  -p 8000:8000 \
  --env-file backend/.env \
  --restart unless-stopped \
  homepage-ai-backend
```

Verify the assistant is answering with your information:

```bash
curl -s -X POST https://your-api-domain/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Who are you?"}' | python3 -m json.tool
```
