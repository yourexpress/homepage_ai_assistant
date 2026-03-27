# Knowledge Templates - Offline Editing Guide

This guide explains how to prepare personalized knowledge files for the AI
portfolio assistant without committing private runtime data to the repository.

The repository keeps reusable templates in `backend/knowledge/templates/`.
Your real runtime knowledge files should be created from those templates and
stored privately on your machine or deployment target.

## Step 1 - Copy the Templates

```bash
mkdir -p my-knowledge
cp backend/knowledge/templates/profile_template.json      my-knowledge/profile.json
cp backend/knowledge/templates/experience_template.json   my-knowledge/experience.json
cp backend/knowledge/templates/projects_template.json     my-knowledge/projects.json
cp backend/knowledge/templates/publications_template.json my-knowledge/publications.json
cp backend/knowledge/templates/faq_template.json          my-knowledge/faq.json
```

## Step 2 - Fill in English and Chinese

Visitor-facing text may be stored either as a plain string or as a localized
object:

```json
{
  "en": "English text",
  "zh": "中文内容"
}
```

The recommended workflow is to provide both English and Chinese for any text
that may appear in the assistant's answers.

If you want the homepage and assistant to show public contact details, add them
to your runtime knowledge using public values only. The homepage contact card
prefers these public categories when present:

- email
- LinkedIn
- GitHub

Example `profile.json` excerpt:

```json
{
  "name": {
    "en": "Your Full Name",
    "zh": "你的中文姓名"
  },
  "headline": {
    "en": "AI Systems Engineer",
    "zh": "AI 系统工程师"
  },
  "education": [
    {
      "degree": {
        "en": "Master of Science in Computer Science",
        "zh": "计算机科学硕士"
      },
      "institution": {
        "en": "Your University",
        "zh": "你的大学"
      },
      "year": 2026
    }
  ],
  "skills": [
    "Python",
    {
      "en": "Distributed systems",
      "zh": "分布式系统"
    }
  ],
  "public_contacts": [
    {
      "type": "email",
      "label": { "en": "Email", "zh": "邮箱" },
      "value": "you@example.com"
    },
    {
      "type": "linkedin",
      "label": { "en": "LinkedIn", "zh": "LinkedIn" },
      "value": "https://www.linkedin.com/in/your-profile"
    },
    {
      "type": "github",
      "label": { "en": "GitHub", "zh": "GitHub" },
      "value": "https://github.com/your-handle"
    }
  ]
}
```

## Step 3 - Validate Locally

Run the validator before deployment:

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

## Step 4 - Place the Files in Private Runtime Storage

For local development, you can copy the validated files into `backend/knowledge/`
as untracked runtime files.

```bash
cp my-knowledge/profile.json      backend/knowledge/profile.json
cp my-knowledge/experience.json   backend/knowledge/experience.json
cp my-knowledge/projects.json     backend/knowledge/projects.json
cp my-knowledge/publications.json backend/knowledge/publications.json
cp my-knowledge/faq.json          backend/knowledge/faq.json
```

For containers or production, mount the completed files into `/app/knowledge/`
on the server.

Do not commit the completed runtime files back into the public repository.

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

## Privacy Checklist

Do not include:

- home or mailing address
- personal phone number
- salary or compensation information
- private information about other people
- any secret that should stay server-side only

The validator will catch common cases, but you should still review the files
manually before deployment.

For the field-by-field schema reference, see
[`backend/knowledge/templates/README.md`](../backend/knowledge/templates/README.md).
