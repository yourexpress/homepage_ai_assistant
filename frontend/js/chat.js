/**
 * chat.js — Portfolio AI Assistant chat UI
 *
 * Sends visitor messages to the backend /api/chat endpoint and renders
 * the response in the chat window.  Handles rate-limit, server-busy, and
 * unexpected error responses gracefully.
 */

"use strict";

// ── Configuration ──────────────────────────────────────────
const BACKEND_URL = "https://api.runyuma.uk"; // update after deployment
const MAX_INPUT_LENGTH = 1000;

// ── DOM refs ───────────────────────────────────────────────
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const charCounter = document.getElementById("char-counter");

// ── State ──────────────────────────────────────────────────
let isWaiting = false;

// ── Helpers ────────────────────────────────────────────────

function appendMessage(role, text, extra = {}) {
  const el = document.createElement("div");
  el.classList.add("message", role);
  if (extra.blocked) el.classList.add("blocked");
  el.textContent = text;
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}

function removeElement(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function setFormBusy(busy) {
  isWaiting = busy;
  sendBtn.disabled = busy;
  chatInput.disabled = busy;
}

function updateCharCounter() {
  const len = chatInput.value.length;
  charCounter.textContent = `${len} / ${MAX_INPUT_LENGTH}`;
  charCounter.className = "char-counter";
  if (len > MAX_INPUT_LENGTH * 0.9) charCounter.classList.add("near-limit");
  if (len >= MAX_INPUT_LENGTH) charCounter.classList.add("over-limit");
}

function errorMessage(status) {
  if (status === 429) {
    return "⏳ You've sent too many messages. Please wait a moment and try again.";
  }
  if (status === 503) {
    return "🔄 The assistant is currently busy. Please try again in a few seconds.";
  }
  return "⚠️ Something went wrong. Please try again.";
}

// ── Event listeners ────────────────────────────────────────

chatInput.addEventListener("input", updateCharCounter);

chatInput.addEventListener("keydown", (e) => {
  // Submit on Enter (without Shift)
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!isWaiting) chatForm.dispatchEvent(new Event("submit"));
  }
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (isWaiting) return;

  const message = chatInput.value.trim();
  if (!message) return;
  if (message.length > MAX_INPUT_LENGTH) {
    appendMessage(
      "error",
      `Message is too long (${message.length} / ${MAX_INPUT_LENGTH} characters).`
    );
    return;
  }

  // Render user message
  appendMessage("user", message);
  chatInput.value = "";
  updateCharCounter();

  // Show typing indicator
  const typingEl = appendMessage("typing", "Thinking…");
  setFormBusy(true);

  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    removeElement(typingEl);

    if (!response.ok) {
      appendMessage("error", errorMessage(response.status));
      return;
    }

    const data = await response.json();
    appendMessage("assistant", data.reply, { blocked: data.blocked });
  } catch (err) {
    removeElement(typingEl);
    console.error("Chat request failed:", err);
    appendMessage("error", "⚠️ Unable to reach the assistant. Check your connection.");
  } finally {
    setFormBusy(false);
    chatInput.focus();
  }
});
