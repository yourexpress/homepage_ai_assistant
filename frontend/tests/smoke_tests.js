/**
 * smoke_tests.js — Lightweight browser-based smoke tests for the frontend.
 *
 * Run by opening frontend/tests/smoke_tests.html in a browser.
 * No framework required — uses plain JS assertions.
 *
 * These tests verify DOM structure and basic JS behaviour WITHOUT a
 * running backend.  They complement (but do not replace) the backend
 * pytest suite.
 *
 * Test categories:
 *   1. DOM structure — required elements exist in index.html
 *   2. Component behavior — char counter, form state, error messages
 *   3. Contract — JS constants match backend expectations
 *
 * TODO markers indicate tests that need backend connectivity or
 * additional wiring to complete.
 */

"use strict";

// ── Test runner ────────────────────────────────────────────

const results = [];

function assert(condition, description) {
  results.push({ pass: !!condition, description });
}

function skip(description) {
  results.push({ pass: null, description: `[SKIP] ${description}` });
}

function renderResults() {
  const el = document.getElementById("results");
  const passed = results.filter((r) => r.pass === true).length;
  const failed = results.filter((r) => r.pass === false).length;
  const skipped = results.filter((r) => r.pass === null).length;

  let html = `<p><strong>${passed} passed, ${failed} failed, ${skipped} skipped</strong></p>`;
  for (const r of results) {
    const cls = r.pass === true ? "pass" : r.pass === false ? "fail" : "skip";
    const icon = r.pass === true ? "✅" : r.pass === false ? "❌" : "⏭️";
    html += `<div class="test-row ${cls}">${icon} ${r.description}</div>`;
  }
  el.innerHTML = html;
}

// ── Wait for iframe to load before running tests ──────────

const frame = document.getElementById("test-frame");

frame.addEventListener("load", () => {
  const doc = frame.contentDocument;

  // ── 1. DOM structure tests ────────────────────────────────

  assert(
    doc.getElementById("chat-window") !== null,
    "index.html has a #chat-window element"
  );

  assert(
    doc.getElementById("chat-form") !== null,
    "index.html has a #chat-form element"
  );

  assert(
    doc.getElementById("chat-input") !== null,
    "index.html has a #chat-input textarea"
  );

  assert(
    doc.getElementById("send-btn") !== null,
    "index.html has a #send-btn button"
  );

  assert(
    doc.getElementById("char-counter") !== null,
    "index.html has a #char-counter element"
  );

  // ── 2. Attribute / constraint tests ───────────────────────

  const textarea = doc.getElementById("chat-input");
  assert(
    textarea && textarea.getAttribute("maxlength") === "1000",
    "Textarea maxlength is 1000"
  );

  const chatWindow = doc.getElementById("chat-window");
  assert(
    chatWindow && chatWindow.getAttribute("role") === "log",
    "Chat window has role='log' for accessibility"
  );

  assert(
    chatWindow && chatWindow.getAttribute("aria-live") === "polite",
    "Chat window has aria-live='polite'"
  );

  // ── 3. Initial state tests ────────────────────────────────

  assert(
    doc.querySelector(".message.assistant") !== null,
    "Chat window has an initial assistant greeting"
  );

  const charCounter = doc.getElementById("char-counter");
  assert(
    charCounter && charCounter.textContent.includes("0 / 1000"),
    "Character counter starts at 0 / 1000"
  );

  // ── 4. JS constant contract tests ─────────────────────────

  // TODO: These require evaluating chat.js in the iframe context.
  // The BACKEND_URL and MAX_INPUT_LENGTH constants should match
  // the backend's expected configuration.
  skip("BACKEND_URL constant matches deployment config (requires JS eval)");
  skip("MAX_INPUT_LENGTH constant equals 1000 (requires JS eval)");

  // ── 5. Navigation tests ───────────────────────────────────

  const navLinks = doc.querySelectorAll("nav a");
  assert(
    navLinks.length >= 2,
    "Navigation has at least 2 links (Chat, Metrics)"
  );

  const chatLink = doc.querySelector('nav a[href="index.html"]');
  assert(
    chatLink !== null,
    "Navigation includes a Chat link"
  );

  const metricsLink = doc.querySelector('nav a[href="metrics.html"]');
  assert(
    metricsLink !== null,
    "Navigation includes a Metrics link"
  );

  // ── 6. Responsive / a11y structure ────────────────────────

  const metaViewport = doc.querySelector('meta[name="viewport"]');
  assert(
    metaViewport !== null,
    "index.html has a viewport meta tag"
  );

  const lang = doc.documentElement.getAttribute("lang");
  assert(
    lang === "en",
    "HTML lang attribute is 'en'"
  );

  // ── Render results ────────────────────────────────────────
  renderResults();
});
