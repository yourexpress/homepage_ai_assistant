# Knowledge File Templates

This directory contains template JSON files for the five knowledge files that
power the AI portfolio assistant.

The templates are now organized around a bilingual-friendly text shape:

```json
{
  "en": "English text",
  "zh": "中文内容"
}
```

Every field that represents visitor-facing text may use either:

- A plain string, for backward compatibility.
- A localized object with `en` and/or `zh`.

The recommended template format is bilingual so the knowledge base can answer
in both English and Chinese.

---

## Quick Start

1. Copy the template you need from this directory.
2. Fill in the English and Chinese placeholders with your public information.
3. Validate the files with `backend/scripts/validate_knowledge.py`.
4. Upload the completed files to `backend/knowledge/`.
5. Rebuild the backend image or redeploy the service.

---

## Text Rules

Use localized objects for narrative fields such as:

- `name`
- `headline`
- `degree`
- `institution`
- `location_public`
- `title`
- `organization`
- `focus`
- `description`
- `project.name`
- `project.description`
- `publication.title`
- `publication.venue`
- `faq.question`
- `faq.answer`

Lists such as `skills`, `research_interests`, and `technologies` may contain:

- Plain strings
- Localized objects

Example:

```json
"skills": [
  "Python",
  { "en": "Distributed systems", "zh": "分布式系统" }
]
```

---

## File Schemas

### `profile_template.json` -> `profile.json`

Top-level personal profile loaded first into the system prompt.

Required fields:

- `name`: localized text or string
- `headline`: localized text or string
- `education`: array
- `skills`: array of string/localized text

Optional fields:

- `location_public`: localized text or string
- `links`: object of label -> URL
- `research_interests`: array of string/localized text
- `public_contacts`: array of approved public contact entries

Education entry fields:

- `degree`: localized text or string
- `institution`: localized text or string
- `year`: integer

Public contact entry fields:

- `type`: string such as `email`, `whatsapp`, `wechat`, or `phone`
- `label`: localized text or string shown to the visitor
- `value`: string value to share publicly
- `note`: optional localized text or string

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
- `technologies`: array of string/localized text
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

---

## Privacy Rules

Never put the following information in these files:

- Home or mailing address
- Personal phone number
- Personal email address
- Salary or compensation details
- Private information about other people

Public professional links such as GitHub, portfolio, LinkedIn, or a public
contact form are okay.

---

## Validation

Validate one or more files before deployment:

```bash
python backend/scripts/validate_knowledge.py \
  backend/knowledge/profile.json \
  backend/knowledge/experience.json \
  backend/knowledge/projects.json \
  backend/knowledge/publications.json \
  backend/knowledge/faq.json
```

The validator checks:

- JSON syntax
- Top-level object structure
- Required keys
- Nested entry schemas
- Localized `en`/`zh` objects
- Common private-data patterns

---

## Recommended Workflow

1. Start from the template files in this directory.
2. Fill in both English and Chinese wherever a visitor might read the text.
3. Keep URLs and status values language-neutral.
4. Run the validator.
5. Copy the completed files into `backend/knowledge/`.
