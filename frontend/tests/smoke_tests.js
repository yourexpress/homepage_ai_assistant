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

let framesLoaded = 0;
const totalFrames = 3;

function onFrameReady() {
  framesLoaded += 1;
  if (framesLoaded === totalFrames) {
    renderResults();
  }
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
  assert(doc.querySelector('a[href="beta.html"]') !== null, "index.html includes a Beta Homepage link in navigation");
  assert(doc.getElementById("chat-toggle") !== null, "index.html includes a floating chat toggle button");
  assert(doc.getElementById("chat-widget") !== null, "index.html includes a floating chat widget");
  assert(doc.getElementById("chat-clear-btn") !== null, "index.html includes a clear-session control");
  assert(doc.getElementById("chat-close-btn") !== null, "index.html includes a close control for the chat bubble");
  assert(doc.getElementById("chat-resize-handle") !== null, "index.html includes a custom chat resize handle");
  assert(doc.getElementById("chat-mode-chip") !== null, "index.html includes a mode chip inside the chat header");
  assert(doc.getElementById("happy-toggle") !== null, "index.html includes a separate private entrance toggle");
  assert(doc.getElementById("happy-dock") !== null, "index.html includes a compact private entrance dock");
  assert(doc.getElementById("comment-form") !== null, "index.html includes a compact feedback form");
  assert(doc.querySelector(".feedback-card") !== null, "index.html includes the compact feedback card layout");
  assert(doc.getElementById("comments-list") === null, "index.html no longer renders a public comments list");
  assert(doc.getElementById("comments-prev-btn") === null, "index.html no longer renders public comment pagination controls");

  const websiteRating = doc.getElementById("website-rating");
  const resumeRating = doc.getElementById("resume-rating");
  assert(websiteRating && websiteRating.firstElementChild && websiteRating.firstElementChild.value === "", "website rating is optional");
  assert(resumeRating && resumeRating.firstElementChild && resumeRating.firstElementChild.value === "", "resume rating is optional");

  const viewport = doc.querySelector('meta[name="viewport"]');
  assert(viewport !== null, "page includes viewport meta tag");

  onFrameReady();
});

const managerFrame = document.getElementById("test-frame-manager");

managerFrame.addEventListener("load", () => {
  const doc = managerFrame.contentDocument;

  assert(doc.getElementById("admin-key-input") !== null, "manager.html includes admin key input");
  assert(doc.getElementById("manager-load-btn") !== null, "manager.html includes load dashboard button");
  assert(doc.getElementById("manager-form") !== null, "manager.html includes the editable content form");
  assert(doc.getElementById("manager-profile-overrides") !== null, "manager.html includes profile override section container");
  assert(doc.getElementById("profile-about-section") !== null, "manager.html includes About override section");
  assert(doc.getElementById("profile-education-section") !== null, "manager.html includes Education override section");
  assert(doc.getElementById("profile-research-section") !== null, "manager.html includes Research override section");
  assert(doc.getElementById("profile-contact-section") !== null, "manager.html includes Contact override section");
  assert(doc.getElementById("resume-upload-section") !== null, "manager.html includes resume upload section");
  assert(doc.getElementById("resume-file-input") !== null, "manager.html includes resume file input");
  assert(doc.getElementById("resume-upload-btn") !== null, "manager.html includes resume upload button");

  onFrameReady();
});

const betaFrame = document.getElementById("test-frame-beta");

betaFrame.addEventListener("load", () => {
  const doc = betaFrame.contentDocument;

  /* Part 1: Personal Information Zone */
  assert(doc.getElementById("profile-name") !== null, "beta.html includes a profile name heading");
  assert(doc.getElementById("profile-headline") !== null, "beta.html includes a profile headline");
  assert(doc.getElementById("profile-badge") !== null, "beta.html includes a profile badge");
  assert(doc.getElementById("about-paragraphs") !== null, "beta.html includes an about paragraphs area");
  assert(doc.getElementById("education-list") !== null, "beta.html includes an education list");
  assert(doc.getElementById("skills-list") !== null, "beta.html includes a skills/research list");
  assert(doc.getElementById("contact-list") !== null, "beta.html includes a contact list");
  assert(doc.getElementById("data-model-list") !== null, "beta.html includes a data/admin model card");
  assert(doc.querySelector('a[href="experience.html"]') !== null, "beta.html links to experience page");
  assert(doc.querySelector('a[href="publications.html"]') !== null, "beta.html links to publications page");
  assert(doc.querySelector('a[href="index.html"]') !== null, "beta.html links back to current homepage");

  /* Part 2: Sticky Chat Bar */
  assert(doc.getElementById("chat-zone") !== null, "beta.html includes a sticky chat zone");
  assert(doc.getElementById("chat-messages") !== null, "beta.html includes a chat messages container");
  assert(doc.getElementById("chat-form") !== null, "beta.html includes a chat input form");
  assert(doc.getElementById("chat-input") !== null, "beta.html includes a chat input textarea");
  assert(doc.getElementById("send-btn") !== null, "beta.html includes a send button");
  assert(doc.getElementById("chat-suggestions") !== null, "beta.html includes suggestion buttons container");
  assert(doc.querySelectorAll(".suggestion-btn").length >= 3, "beta.html includes at least 3 suggestion buttons");
  assert(doc.getElementById("chat-minimize-btn") !== null, "beta.html includes a minimize button");
  assert(doc.getElementById("chat-clear-btn") !== null, "beta.html includes a clear chat button");
  assert(doc.getElementById("chat-zone-drag-handle") !== null, "beta.html includes a drag handle");
  assert(doc.getElementById("chat-zone-resize-handle") !== null, "beta.html includes a resize handle");

  /* Responsive meta */
  const viewport = doc.querySelector('meta[name="viewport"]');
  assert(viewport !== null, "beta.html includes viewport meta tag");

  onFrameReady();
});
