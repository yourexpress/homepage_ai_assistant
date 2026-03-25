# Test Data Fixtures

This directory contains static test data used by the backend test suite.

## Files

| File | Purpose |
|------|---------|
| `chat_requests.json` | Sample request payloads for `/api/chat` |
| `expected_responses.json` | Expected response shapes for assertions |
| `policy_samples.json` | Sample inputs for policy guard testing |

## Usage

Load with `json.load()` in test fixtures, or reference the constants
in `tests/helpers.py` which pre-defines common test messages.

## Rules

- Never commit real API keys or personal data here.
- Keep payloads small and deterministic.
- Update this data when `models.py` schemas change.
