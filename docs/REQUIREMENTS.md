# Product Requirements

This document describes the current feature scope of the portfolio assistant.

## Product Goal

Provide a public-facing, bilingual portfolio homepage where visitors can:

- understand Runyu Ma's profile through curated homepage content
- talk to an AI assistant grounded in approved public knowledge
- leave lightweight feedback about the website and resume presentation

At the same time, the owner should be able to:

- edit homepage copy through a protected manager entrance
- keep English and Chinese homepage copy synchronized through that manager flow
- deploy the system in containers while keeping private knowledge and secrets on
  the server

## Primary Users

- Recruiters and hiring managers
- Collaborators and researchers
- General visitors
- The site owner through the protected manager entrance
- One private visitor with access to the optional happy-personality flow

## Functional Requirements

### Homepage

- `frontend/index.html` is the main page.
- The homepage shows:
  - a hero area populated from file-backed site content
  - a floating AI chat bubble
  - a compact feedback card
- The visual design should feel clean, modern, and easy to scan on desktop and
  mobile.

### Chat

- `POST /api/chat` accepts:
  - `message`
  - optional `history`
  - optional `session_id`
  - optional `happy_token`
- The backend uses current-session history when constructing the LLM message
  list.
- The frontend stores current-session history in browser session storage.
- The frontend can clear current-session history without affecting other
  visitors.
- Desktop or laptop visitors can resize the chat bubble smoothly.
- The chat bubble must be closable and should prioritize message space over
  oversized controls.

### Knowledge and Prompting

- Answers are grounded in approved runtime knowledge files.
- The repository should document the template-based workflow rather than commit
  real `backend/knowledge/*.json` data.
- The assistant should not show raw internal markers like `source:profile.json`
  in visitor-facing answers.
- If references help, the assistant may summarize them at the end in a short,
  readable way.
- Knowledge supports bilingual values using plain strings or `{ "en": "...",
  "zh": "..." }` objects.
- Public contact methods may be included only when explicitly present in the
  knowledge base.

### Manager Entrance

- `frontend/manager.html` provides a protected manager UI.
- The manager uses `GET /api/admin/site-content` and
  `PUT /api/admin/site-content`.
- Access requires `ADMIN_API_KEY`.
- Homepage content is stored in `SITE_CONTENT_FILE`.

### English and Chinese Auto-Sync

- Homepage copy edited through the manager flow is stored as bilingual content.
- If only one side of a bilingual value changes, the backend attempts to fill
  the other side through the translation helper.
- This sync behavior applies to manager edits, not arbitrary manual file edits.

### Visitor Feedback

- Visitors can submit feedback with:
  - optional author name
  - website rating from 0 to 5
  - resume rating from 0 to 5
  - free-text body
- The homepage does not need to show a public comments feed, sorting controls,
  or next/previous pagination controls.
- Feedback is stored in `COMMENTS_FILE`.

### Happy Personality

- The happy personality is optional and disabled by default.
- Real secrets are not stored in the public repository.
- The backend reads placeholder-configured values from environment variables:
  - `HAPPY_MODE_ENABLED`
  - `HAPPY_MODE_ACCESS_CODE`
  - `HAPPY_MODE_QUESTION`
  - `HAPPY_MODE_EXPECTED_ANSWER`
  - `HAPPY_MODE_SECRET`
- The frontend exposes a small private-code bubble near the lower-left corner.
- If the code is correct, the backend returns the configured challenge
  question, and the frontend continues the flow inside the main chat bubble.
- If the answer is wrong, the UI should reply `wrong answer, thumb down`.
- If the answer matches the configured expected answer, the backend issues a
  signed token for that browser session.
- The happy personality stays subject to the same privacy and safety boundaries
  as the default assistant.

### Deployment

- The system must support a GitHub Pages deployment for the static frontend.
- The system must support a two-container deployment:
  - static frontend container
  - backend API container
- Private knowledge files and runtime data should be mounted from persistent
  server storage.

## Non-Functional Requirements

- Keep the public site easy to navigate on desktop and mobile.
- Keep the backend single-instance friendly and simple to operate.
- Keep private data and secrets out of the public repository.
- Keep the prompt and safety model understandable enough to audit.

## Explicit Current Limitations

- Feedback and editable homepage content are file-backed, not database-backed.
- Translation sync depends on LLM availability.
- Session history is browser-session scoped, not account scoped.
- Happy personality is only active for sessions with a valid signed token.
