# Knowledge File Templates

This directory contains the template JSON files for the five knowledge files
that power the AI portfolio assistant at runtime.

The templates are repository-safe starting points. Your completed files should
be filled in with your own public information and then stored privately as
runtime data, not committed back into the repo.

## Text Shape

Visitor-facing text may use either:

- a plain string, for backward compatibility
- a localized object with `en` and/or `zh`

```json
{
  "en": "English text",
  "zh": "中文内容"
}
```

The recommended format is bilingual so the assistant can answer naturally in
both English and Chinese.

## Recommended Workflow

1. Copy the template files out of this directory.
2. Fill in your public information in English and Chinese.
3. Validate the completed files with `backend/scripts/validate_knowledge.py`.
4. Place the completed files into private runtime storage such as
   `backend/knowledge/` locally or `/app/knowledge/` in deployment.
5. Keep the completed files out of version control.

## File Schemas

### `profile_template.json` -> `profile.json`

Top-level personal profile loaded first into the system prompt.

Required fields:

- `name`: localized text or string
- `headline`: localized text or string
- `education`: array
- `skills`: array of string or localized text

Optional fields:

- `location_public`: localized text or string
- `links`: object of label -> URL
- `research_interests`: array of string or localized text
- `public_contacts`: array of approved public contact entries

Education entry fields:

- `degree`: localized text or string
- `institution`: localized text or string
- `year`: integer

Public contact entry fields:

- `type`: string such as `email`, `linkedin`, `github`, `whatsapp`, `wechat`, or `phone`
- `label`: localized text or string shown to the visitor
- `value`: string value to share publicly
- `note`: optional localized text or string

The homepage contact card prefers public `email`, `linkedin`, and `github`
values when they are available.

### `experience_template.json` -> `experience.json`

Required fields:

- `positions`: array

Position entry fields:

- `title`: localized text or string
- `organization`: localized text or string
- `start_year`: integer
- `end_year`: integer or `null`
- `focus`: localized text or string
- `description`: localized text or string

### `projects_template.json` -> `projects.json`

Required fields:

- `projects`: array

Project entry fields:

- `name`: localized text or string
- `description`: localized text or string
- `url`: string
- `technologies`: array of string or localized text
- `status`: string such as `active`, `completed`, or `archived`

### `publications_template.json` -> `publications.json`

Required fields:

- `publications`: array

Publication entry fields:

- `title`: localized text or string
- `year`: integer
- `venue`: localized text or string
- `url`: string

### `faq_template.json` -> `faq.json`

Required fields:

- `entries`: array

FAQ entry fields:

- `question`: localized text or string
- `answer`: localized text or string

## Privacy Rules

Never put the following information in these files:

- home or mailing address
- personal phone number
- salary or compensation details
- private information about other people
- secrets used for happy mode or admin access

Public professional links such as GitHub, portfolio, and LinkedIn are okay.

## Validation

Validate one or more completed files before deployment:

```bash
python backend/scripts/validate_knowledge.py \
  my-knowledge/profile.json \
  my-knowledge/experience.json \
  my-knowledge/projects.json \
  my-knowledge/publications.json \
  my-knowledge/faq.json
```
