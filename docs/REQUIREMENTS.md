# Product Requirements

This document describes the current feature scope of the portfolio assistant.

## Product Goal

Provide a public-facing, bilingual portfolio homepage where visitors can:

- understand Runyu Ma's profile through curated homepage content
- talk to an AI assistant grounded in approved public knowledge
- leave lightweight feedback about the website and resume presentation
- download the latest resume directly from the header
- see latest news in a horizontal ticker

At the same time, the owner should be able to:

- edit homepage copy through a protected manager entrance
- keep English and Chinese homepage copy synchronized through that manager flow
- upload and manage resume files through the manager entrance
- edit news items through the manager entrance
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
- `frontend/beta.html` is the beta homepage with a compact, informal layout.
- Both homepages show:
  - a hero area populated from file-backed site content
  - a chat interface (floating bubble on index, sticky bar on beta)
  - a compact feedback card (index only)
- The visual design should feel clean, modern, and easy to scan on desktop and
  mobile.

### Consistent Header Bar

- Every public-facing page must show the same complete header bar.
- The header includes: logo, navigation links (Home, Experience, Publications,
  GitHub), a Resume download icon/link, and a language switcher.
- The Resume link in the header checks the backend for availability and hides
  itself when no resume has been uploaded.
- Internal pages (manager, metrics, comments inbox) may have their own
  navigation appropriate to admin workflows.

### News Ticker

- The beta homepage displays a horizontal scrolling news ticker below the
  header.
- News items are stored as bilingual entries in site content
  (`news_title`, `news_items`).
- The owner can edit news items through the manager page (same
  `PUT /api/admin/site-content` endpoint).
- The ticker scrolls continuously from right to left using CSS animation.
- When no news items exist, the ticker section is hidden.

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

### Chat Message Display

- Assistant responses must display completely. No truncation, line-clamping,
  ellipsis, fixed bubble heights, or overflow rules that hide message text.
- The chat body auto-expands to show content up to the viewport-based maximum.
- Long messages that exceed the viewport maximum are readable through normal
  vertical scrolling in the message list.
- Long assistant messages (over a configurable height threshold) are rendered
  in a collapsed state with a "Show more" toggle. Visitors can expand to read
  the full content and collapse it again. User messages are never collapsed.
- The clear-history button uses a clean, recognizable icon (not the trash-can
  icon). A simple broom/sweep or refresh-style icon is preferred.

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
- The manager includes a news items editor (add, edit, remove bilingual news
  entries) as part of the site content form.

### Resume Management

- The manager page includes a resume upload section (`POST /api/admin/resume`).
- Accepted formats: PDF, DOC, DOCX. Maximum size: 10 MB.
- The backend keeps the last three uploaded copies (oldest deleted first).
- A public endpoint (`GET /api/resume/latest`) serves the most recent resume
  for visitor download.
- A public metadata endpoint (`GET /api/resume/info`) reports availability.
- The beta homepage header shows a Resume download icon that links to the
  latest resume. The icon is hidden when no resume is available.

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

- The system must support a single-server deployment where nginx serves the
  static frontend and proxies API requests to the backend container.
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
- News items are part of the site-content store, not a separate feed system.
- Resume storage is file-backed with a simple three-copy retention policy.
