# Frontend Tests

This directory contains lightweight browser-based smoke tests for the
frontend static site.

## Running

Open `smoke_tests.html` in any modern browser.  Tests run automatically
and display pass/fail/skip results inline.

No backend server is required — the tests validate DOM structure,
accessibility attributes, and JS constant contracts only.

## Files

| File              | Purpose                                      |
|-------------------|----------------------------------------------|
| `smoke_tests.html` | Test runner page (loads `index.html` in iframe) |
| `smoke_tests.js`   | Test assertions for DOM structure and A11y     |

## Extending

1. Add new `assert()` calls in `smoke_tests.js`.
2. Use `skip()` for tests that require backend connectivity.
3. Keep tests side-effect-free — don't submit forms or make network requests.
