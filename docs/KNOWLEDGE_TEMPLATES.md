# Knowledge Templates - Offline Editing Guide

This guide explains how to prepare personalized knowledge files for the AI
portfolio assistant without editing production data directly.

The knowledge system now supports bilingual content. Visitor-facing text may
be stored either as a plain string or as a localized object:

```json
{
  "en": "English text",
  "zh": "中文内容"
}
```

The recommended workflow is to provide both English and Chinese for any text
that may appear in the assistant's answers.

---

## Step 1 - Copy the Templates

The templates live in `backend/knowledge/templates/`.

```bash
cp backend/knowledge/templates/profile_template.json      my-knowledge/profile.json
cp backend/knowledge/templates/experience_template.json   my-knowledge/experience.json
cp backend/knowledge/templates/projects_template.json     my-knowledge/projects.json
cp backend/knowledge/templates/publications_template.json my-knowledge/publications.json
cp backend/knowledge/templates/faq_template.json          my-knowledge/faq.json
```

---

## Step 2 - Fill in English and Chinese

Use bilingual objects for descriptive text fields.

Example `profile.json`:

```json
{
  "name": {
    "en": "Your Full Name",
    "zh": "你的中文姓名"
  },
  "headline": {
    "en": "Software Engineer",
    "zh": "软件工程师"
  },
  "education": [
    {
      "degree": {
        "en": "Bachelor of Science in Computer Science",
        "zh": "计算机科学理学学士"
      },
      "institution": {
        "en": "Your University",
        "zh": "你的大学"
      },
      "year": 2024
    }
  ],
  "skills": [
    "Python",
    {
      "en": "Distributed systems",
      "zh": "分布式系统"
    }
  ]
}
```

You can still use plain strings for fields that do not need translation yet,
but bilingual values are preferred for:

- profile text
- experience text
- project descriptions
- publication titles and venues
- FAQ questions and answers

---

## Step 3 - Validate Locally

Run the validator before deploying:

```bash
python backend/scripts/validate_knowledge.py \
  my-knowledge/profile.json \
  my-knowledge/experience.json \
  my-knowledge/projects.json \
  my-knowledge/publications.json \
  my-knowledge/faq.json
```

The validator checks:

- JSON syntax
- required keys
- nested entry structure
- localized `en`/`zh` fields
- common private-data patterns

---

## Step 4 - Upload or Copy into `backend/knowledge/`

After validation, copy the completed files into `backend/knowledge/` for local
development or upload them to your deployment target.

Example local copy:

```bash
cp my-knowledge/profile.json      backend/knowledge/profile.json
cp my-knowledge/experience.json   backend/knowledge/experience.json
cp my-knowledge/projects.json     backend/knowledge/projects.json
cp my-knowledge/publications.json backend/knowledge/publications.json
cp my-knowledge/faq.json          backend/knowledge/faq.json
```

---

## Step 5 - Redeploy and Verify

Rebuild the backend image or redeploy the application so the updated knowledge
files are included.

Then test both languages:

```bash
curl -s -X POST https://your-api-domain/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Who are you?"}'

curl -s -X POST https://your-api-domain/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你是谁？"}'
```

---

## Privacy Checklist

Do not include:

- home or mailing address
- personal phone number
- personal email address
- salary or compensation information
- private information about other people

The validator will catch common cases, but you should still review the files
manually before deployment.

---

## Notes

- URLs and status values usually do not need translation.
- The knowledge loader renders both English and Chinese into the system prompt.
- The assistant is instructed to respond in the user's language when bilingual
  data is available.

For the field-by-field schema reference, see
[`backend/knowledge/templates/README.md`](../backend/knowledge/templates/README.md).
