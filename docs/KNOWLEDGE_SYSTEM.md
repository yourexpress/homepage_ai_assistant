# Knowledge System

This document explains how the AI assistant gets its factual grounding.

## Purpose

The assistant should answer from approved public information without exposing
private data or internal provenance noise to visitors.

## Runtime Source Files

The knowledge loader reads these JSON files at runtime:

- `backend/knowledge/profile.json`
- `backend/knowledge/experience.json`
- `backend/knowledge/projects.json`
- `backend/knowledge/publications.json`
- `backend/knowledge/faq.json`

These runtime files are intentionally not committed with real data. Instead,
create them from the templates in `backend/knowledge/templates/` and keep the
completed versions private.

## Supported Value Shapes

Visitor-facing text can be either:

- a plain string
- a localized object

```json
{
  "en": "English text",
  "zh": "Chinese text"
}
```

## What the Loader Builds

`backend/app/services/knowledge_base.py`:

- loads all runtime knowledge files
- renders profile, experience, projects, publications, and FAQ sections
- builds a system prompt for the assistant
- includes bilingual instructions
- includes reader-friendly reference guidance
- includes public contact information when present in the approved data

## Important Prompt Rules

The current prompt is designed to:

- help visitors understand Runyu Ma naturally
- tell a coherent professional story
- avoid raw strings like `source:profile.json` in normal answers
- use short human-readable references only when they are actually helpful
- distinguish direct facts from inference
- refuse private or hidden information

## Public Contacts

Public contacts belong in:

- `profile.json -> public_contacts`
- `profile.json -> links`

The homepage contact card prefers these public categories when available:

- email
- LinkedIn
- GitHub

The assistant should not invent or expose private contact methods.

## Knowledge vs Site Content

These are separate systems.

### Knowledge files

Used for AI grounding.

### Site content file

- `backend/data/site_content.json`

Used for homepage rendering and manager editing.

This separation is intentional:

- knowledge is factual grounding for AI
- site content is presentational copy for the homepage

## Validation

Use the templates guide to create local private files, then validate them:

```bash
python backend/scripts/validate_knowledge.py \
  my-knowledge/profile.json \
  my-knowledge/experience.json \
  my-knowledge/projects.json \
  my-knowledge/publications.json \
  my-knowledge/faq.json
```

The validator checks:

- required keys
- localized value structure
- nested object shape
- common private-data patterns

## Deployment Recommendation

Keep real production knowledge files off the public repository and mount them on
the server into `/app/knowledge`.
