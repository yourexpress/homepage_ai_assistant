"use strict";

const results = [];

function assert(condition, description) {
  results.push({ pass: !!condition, description });
}

function renderResults() {
  const el = document.getElementById("results");
  const passed = results.filter((item) => item.pass).length;
  const failed = results.filter((item) => !item.pass).length;

  let html = `<p><strong>${passed} passed, ${failed} failed</strong></p>`;
  results.forEach((item) => {
    html += `<div class="test-row ${item.pass ? "pass" : "fail"}">${item.pass ? "[PASS]" : "[FAIL]"} ${item.description}</div>`;
  });
  el.innerHTML = html;
}

const frame = document.getElementById("test-frame");

frame.addEventListener("load", () => {
  const doc = frame.contentDocument;

  assert(doc.getElementById("hero-title") !== null, "index.html includes the homepage intro title");
  assert(doc.getElementById("about-paragraphs") !== null, "index.html includes a brief introduction area");
  assert(doc.getElementById("research-list") !== null, "index.html includes a research interests list");
  assert(doc.getElementById("education-list") !== null, "index.html includes an education section");
  assert(doc.getElementById("contact-list") !== null, "index.html includes a contact section");
  assert(doc.querySelector('a[href="experience.html"]') !== null, "navigation includes the experience page");
  assert(doc.querySelector('a[href="publications.html"]') !== null, "navigation includes the publications page");
  assert(doc.getElementById("chat-toggle") !== null, "index.html includes a floating chat toggle button");
  assert(doc.getElementById("chat-widget") !== null, "index.html includes a floating chat widget");
  assert(doc.getElementById("chat-clear-btn") !== null, "index.html includes a clear-session control");
  assert(doc.getElementById("chat-resize-handle") !== null, "index.html includes a custom chat resize handle");
  assert(doc.getElementById("happy-toggle") !== null, "index.html includes a separate private entrance toggle");
  assert(doc.getElementById("happy-widget") !== null, "index.html includes a separate private entrance panel");
  assert(doc.getElementById("happy-deactivate-btn") !== null, "index.html includes a happy-mode deactivate button");
  assert(doc.getElementById("comment-form") !== null, "index.html includes a comment form");

  const websiteRating = doc.getElementById("website-rating");
  const resumeRating = doc.getElementById("resume-rating");
  assert(websiteRating && websiteRating.firstElementChild && websiteRating.firstElementChild.value === "", "website rating is optional");
  assert(resumeRating && resumeRating.firstElementChild && resumeRating.firstElementChild.value === "", "resume rating is optional");

  const viewport = doc.querySelector('meta[name="viewport"]');
  assert(viewport !== null, "page includes viewport meta tag");

  renderResults();
});
