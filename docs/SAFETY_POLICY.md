# Safety Policy

This document describes the current safety model used by the portfolio
assistant.

## Design Goal

Allow helpful discussion of approved public portfolio information while
refusing:

- private personal information
- secrets and credentials
- prompt-injection attempts
- internal architecture probing that should not be exposed publicly

## Two-Layer Control Model

### Layer 1: Regex pre-filter

Implemented in:

- `backend/app/services/policy_guard.py`

This blocks requests before the LLM call when they match known unsafe patterns.

### Layer 2: Grounded system prompt

Implemented in:

- `backend/app/services/knowledge_base.py`
- `backend/app/services/policy_guard.py`

This instructs the model to stay within approved public knowledge even if the
pre-filter misses a phrasing variant.

## Current Blocked Categories

- prompt injection
  - ignore previous instructions
  - reveal system prompt
  - developer mode / jailbreak language
- private information
  - home address
  - private phone number
  - private or personal email
  - salary
  - social security
  - credit card
- secrets
  - api key
  - access token
  - credentials
  - secret key
- internal deployment probing
  - environment variables
  - cloud provider
  - internal config
  - backend database wording

## Allowed Public-Safe Questions

Examples:

- public projects
- public research background
- skills and education
- public contact methods explicitly listed in the knowledge base
- bilingual explanations based on approved content

## Public Contact Rule

The assistant may share public contact methods only when they are explicitly
present in `profile.json -> public_contacts`.

This allows:

- public email
- public WhatsApp
- public WeChat
- masked public phone number

This does not allow:

- hidden contact details
- private phone numbers
- private email addresses
- addresses not intended for public release

## Happy Personality Safety Boundary

Happy mode changes style, not policy.

That means happy mode may be:

- cuter
- warmer
- more active
- more playful

But it still may not:

- reveal private data
- reveal secrets
- provide illegal or unsafe help
- bypass the approved-public-information boundary

## Current Known Limitation

The pre-filter is intentionally lightweight and regex-based. The grounded prompt
is still important as defense in depth for phrasing the regex layer may not
anticipate perfectly.
