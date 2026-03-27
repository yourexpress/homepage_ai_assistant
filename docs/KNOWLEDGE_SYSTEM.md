# Knowledge System

This document explains how the AI assistant gets its factual grounding.

## Purpose

The assistant should answer from approved public information without exposing
private data or internal provenance noise to visitors.

## Source Files

The knowledge loader reads these JSON files:

- `backend/knowledge/profile.json`
- `backend/knowledge/experience.json`
- `backend/knowledge/projects.json`
- `backend/knowledge/publications.json`
- `backend/knowledge/faq.json`

In production, these files are intended to be private server-side assets rather
than public repository content.

## Supported Value Shapes

Visitor-facing text can be either:

- a plain string
- a localized object:

```json
{
  "en": "English text",
  "zh": "Chinese text"
}
```

## What the Loader Builds

`backend/app/services/knowledge_base.py`:

- loads all knowledge files
- renders profile, experience, projects, publications, and FAQ sections
- builds a system prompt for the assistant
- includes bilingual instructions
- includes reader-friendly reference guidance
- includes public contact information when present in the approved data

## Important Current Prompt Rules

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

Supported examples include:

- public email
- public WhatsApp
- public WeChat
- masked public phone number
- portfolio links
- LinkedIn

The assistant should not invent or expose private contact methods.

## Knowledge vs Site Content

These are separate systems:

### Knowledge files

Used for AI grounding.

### Site content file

- `backend/data/site_content.json`

Used for homepage rendering and manager editing.

This separation is intentional:

- knowledge is factual grounding for AI
- site content is presentational copy for the homepage

## Validation

Use:

```bash
python backend/scripts/validate_knowledge.py \
  backend/knowledge/profile.json \
  backend/knowledge/experience.json \
  backend/knowledge/projects.json \
  backend/knowledge/publications.json \
  backend/knowledge/faq.json
```

The validator checks:

- required keys
- localized value structure
- nested object shape
- common private-data patterns

## Deployment Recommendation

Keep real production knowledge files off the public repository and mount them on
the server into `/app/knowledge`.
