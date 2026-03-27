# Frontend Tests

This directory contains lightweight browser-based smoke tests for the static
frontend.

## Running

Open `smoke_tests.html` in a modern browser. The tests run automatically and
show pass/fail results inline.

No backend is required. These tests only validate page structure and basic UI
wiring.

## What They Cover

- homepage chat container and close control
- compact feedback card without public comment pagination
- private-code dock entry for happy mode
- language toggle presence
- basic accessibility structure

## Files

- `smoke_tests.html`
  loads `index.html` in an iframe and runs the test script
- `smoke_tests.js`
  contains the actual assertions
