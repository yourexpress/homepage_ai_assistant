# Implementation Status

This document is no longer a forward-only historical plan. It now summarizes
the current implementation state and the most likely next improvements.

## Implemented

- bilingual knowledge loading
- reader-friendly prompt without raw internal source tags in normal answers
- session-aware chat using browser session history
- desktop-only bubble-width control
- public metrics page
- protected manager entrance
- homepage EN/ZH auto-sync through the manager flow
- visitor comments with voting, sorting, and pagination
- optional happy-personality flow with private server-side secrets
- container deployment scaffolding
- manager profile overrides for homepage personal information (name, headline,
  about paragraphs, education, research interests, contact items) with
  LinkedIn-style grouped sections and array add/remove controls
- beta homepage with wide CSS-Grid layout and a sticky session-aware chat bar
  (suggestion chips, drag-to-resize via pill bar, inline clear-session pill
  inside the input area)
- beta chat session context: history is trimmed in-memory and capped before
  being sent to the backend so conversations stay within the backend limit for
  any session length
- beta chat display: messages area enlarged and auto-scroll target corrected so
  multi-paragraph assistant responses are fully visible and the view tracks the
  latest message automatically
- updated LLM system prompt to guide complete, substantive, well-structured
  answers instead of defaulting to brevity
- frontend interaction tests that verify DOM rendering before and after backend
  responses using fetch mocking (22 assertions across beta and index chat flows)
- backend resume store with three-copy retention and admin upload endpoint
- manager page resume upload section with file input and status display
- public resume download endpoint (`GET /api/resume/latest`) and metadata
  endpoint (`GET /api/resume/info`)
- beta homepage resume link wired to backend availability check
- news items stored as bilingual entries in site content (backend ready)

## Planned — Next Batch

The following features are approved and ready for implementation. They will be
implemented in the order listed after owner confirmation.

### 1. Chat message fold/unfold for long answers

**Goal:** Let visitors collapse and expand long assistant messages instead of
forcing them to scroll past large blocks of text.

**Scope:**
- Add a configurable height threshold (e.g. 200 px of rendered content).
- Assistant messages taller than the threshold render collapsed with a
  gradient fade and a "Show more" button.
- Clicking "Show more" expands to full height with a "Show less" button.
- User messages are never collapsed.
- Applies to both beta chat (beta-chat.js) and index chat (chat.js).

**Files:** `frontend/js/beta-chat.js`, `frontend/js/chat.js`,
`frontend/css/beta.css`, `frontend/css/style.css`

**Out of scope:** Server-side truncation, streaming partial responses.

### 2. Replace the clear-history icon

**Goal:** Replace the trash-can SVG icon on the clear-history button with a
cleaner broom/sweep icon that looks more polished and less alarming.

**Scope:**
- Replace the SVG in `frontend/beta.html` (the `.chat-clear-pill` button).
- Keep the same button behavior, confirmation logic, and CSS.
- No changes to index.html clear button (uses text label "Clear").

**Files:** `frontend/beta.html`

**Out of scope:** Changing index.html clear button style.

### 3. News ticker on beta homepage

**Goal:** Display latest news as a horizontal scrolling ticker below the header
so visitors notice updates without taking up card space.

**Scope:**
- Add a `<div class="news-ticker">` element below the beta header.
- `beta-home.js` reads `news_title` and `news_items` from the existing
  `/api/content` response and renders them into the ticker.
- CSS animation scrolls items right-to-left continuously.
- Hidden when no news items exist.
- Manager page already serves `news_items` through `PUT /api/admin/site-content`;
  add a news-items editor section to the manager form (bilingual add/edit/remove).

**Files:** `frontend/beta.html`, `frontend/css/beta.css`,
`frontend/js/beta-home.js`, `frontend/manager.html`,
`frontend/js/manager.js`

**Out of scope:** Pause-on-hover animation, rich-text news content, separate
news API endpoint.

### 4. Resume download in header bar

**Goal:** Let visitors download the latest resume directly from the header on
every public page, not just from a button buried in the beta hero section.

**Scope:**
- Add a Resume download link/icon to the header in `beta.html`. It checks
  `/api/resume/info` and hides itself when no resume is available.
- Move the resume link from the hero quick-links area to the header bar so it
  is always accessible.
- Other static pages (experience, publications) that share the same header
  structure also get the Resume link.

**Files:** `frontend/beta.html`, `frontend/css/beta.css`,
`frontend/js/beta-home.js`, `frontend/experience.html`,
`frontend/publications.html`

**Out of scope:** Adding resume download to the index.html floating chat
widget. Index.html has its own design.

### 5. Consistent header bar across pages

**Goal:** Every public-facing page shows the same complete navigation so
visitors can move between sections without confusion.

**Scope:**
- Align the header links across `beta.html`, `experience.html`, and
  `publications.html` to a single canonical set: Home, Experience,
  Publications, GitHub, Resume (icon), language switcher.
- Remove the "← Current Homepage" back-link from beta.html (it becomes the
  primary homepage).
- `index.html` keeps its current header since it has a different CSS system
  and is the legacy page.
- Manager/metrics/comments pages keep admin-oriented navigation.

**Files:** `frontend/beta.html`, `frontend/experience.html`,
`frontend/publications.html`, `frontend/css/beta.css`

**Out of scope:** Unifying beta.css and style.css into a single file.
Changing the index.html header or admin page headers.

### 6. Compact and informal beta layout

**Goal:** Tighten the beta homepage layout, remove redundant elements, and
make the presentation feel less formal and more approachable.

**Scope:**
- Remove duplicate sections: the "Data / Admin Model" card in the third row
  is internal-facing and should not appear on the public beta page.
- Reduce vertical spacing between profile rows.
- Simplify the hero area: remove the badge label if it duplicates the headline.
- Merge or remove cards that show the same information as another card.
- Keep one clean copy of each element; remove redundancy.

**Files:** `frontend/beta.html`, `frontend/css/beta.css`,
`frontend/js/beta-home.js`

**Out of scope:** Full redesign of the card system, changing the color palette
or typography.

## Current Architecture Decisions

- static frontend plus FastAPI backend
- file-backed homepage content
- file-backed comments
- file-backed resume storage with three-copy retention
- private knowledge files mounted on the server
- in-memory operational metrics

## Good Next Steps (Future)

- replace file-backed comments/content with a shared database if multi-instance
  deployment is needed
- extend browser automation for the remaining frontend flows (feedback form,
  manager save, happy personality, locale switching)
- add stronger admin authentication if the manager entrance needs broader use
- persist metrics outside process memory if long-term analytics matter
- clean remaining placeholder example content when private production data is
  ready
