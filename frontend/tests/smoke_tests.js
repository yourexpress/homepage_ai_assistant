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

  assert(doc.getElementById("chat-window") !== null, "index.html has a chat window");
  assert(doc.getElementById("chat-form") !== null, "index.html has a chat form");
  assert(doc.getElementById("comment-form") !== null, "index.html has a comment form");
  assert(doc.getElementById("clear-history-btn") !== null, "index.html has a clear-history button");
  assert(doc.querySelector('a[href="manager.html"]') !== null, "navigation includes a Manager link");
  assert(doc.querySelectorAll(".lang-btn").length === 2, "language toggle includes EN and Chinese buttons");
  assert(doc.getElementById("spotlight-grid") !== null, "hero section has spotlight cards container");
  assert(doc.getElementById("about-title") !== null, "index.html includes an About section");
  assert(doc.getElementById("research-list") !== null, "index.html includes a research interests list");
  assert(doc.getElementById("news-list") !== null, "index.html includes a news list");
  assert(doc.getElementById("contact-list") !== null, "index.html includes a contact list");

  const textarea = doc.getElementById("chat-input");
  assert(textarea && textarea.getAttribute("maxlength") === "1000", "chat textarea maxlength is 1000");

  const commentsPrevBtn = doc.getElementById("comments-prev-btn");
  const commentsNextBtn = doc.getElementById("comments-next-btn");
  assert(commentsPrevBtn !== null && commentsNextBtn !== null, "comments pagination controls exist");

  const viewport = doc.querySelector('meta[name="viewport"]');
  assert(viewport !== null, "page includes viewport meta tag");

  renderResults();
});
