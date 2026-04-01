"use strict";

/**
 * Beta Homepage – Compact Sticky Chat Bar
 *
 * Provides a compact chat bar anchored at the bottom of the viewport
 * with suggestion chips and inline message display.  Supports minimize,
 * clear-session, drag-to-move, and vertical resize.
 * Compatible with the existing POST /api/chat backend.
 *
 * Inputs:  User text via chat input, suggestion buttons, toolbar controls.
 * Outputs: Rendered assistant messages in the chat panel.
 *
 * Failure modes:
 *   - Backend unreachable → shows connection error message
 *   - Rate limited        → shows unavailable message
 */
(function () {
  var PortfolioApp = window.PortfolioApp;
  var BACKEND_URL = PortfolioApp.BACKEND_URL;
  var MAX_INPUT_LENGTH = PortfolioApp.MAX_INPUT_LENGTH;
  var MAX_HISTORY_MESSAGES = PortfolioApp.MAX_HISTORY_MESSAGES;
  var STORAGE_KEYS = PortfolioApp.STORAGE_KEYS;
  var getLocale = PortfolioApp.getLocale;
  var getSessionId = PortfolioApp.getSessionId;

  var UI_TEXT = {
    en: {
      greeting: "Hello! I\u2019m the AI assistant for this homepage. Ask me about research, projects, experience, or anything you see here.",
      thinking: "Thinking\u2026",
      unavailable: "The assistant is unavailable right now. Please try again.",
      unreachable: "Unable to reach the assistant. Please check your connection.",
      placeholder: "Ask about experience, publications, projects, or resume\u2026",
      disclaimer: "Context kept for this session only.",
      suggestResearch: "Ask about research focus",
      suggestProjects: "What projects is he building now?",
      suggestPublications: "Summarize publications",
      suggestFit: "How does this fit ML infra roles?",
    },
    zh: {
      greeting: "\u4f60\u597d\uff01\u6211\u662f\u672c\u7ad9\u7684 AI \u52a9\u624b\u3002\u53ef\u4ee5\u5411\u6211\u8be2\u95ee\u7814\u7a76\u65b9\u5411\u3001\u9879\u76ee\u3001\u7ecf\u5386\u6216\u672c\u7ad9\u4efb\u4f55\u5185\u5bb9\u3002",
      thinking: "\u6b63\u5728\u601d\u8003\u2026",
      unavailable: "\u52a9\u624b\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
      unreachable: "\u6682\u65f6\u65e0\u6cd5\u8fde\u63a5\u52a9\u624b\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u3002",
      placeholder: "\u8be2\u95ee\u7ecf\u5386\u3001\u8bba\u6587\u3001\u9879\u76ee\u6216\u7b80\u5386\u2026",
      suggestResearch: "\u4e86\u89e3\u7814\u7a76\u65b9\u5411",
      suggestProjects: "\u4ed6\u5728\u505a\u54ea\u4e9b\u9879\u76ee\uff1f",
      suggestPublications: "\u603b\u7ed3\u8bba\u6587\u53d1\u8868",
      suggestFit: "\u5982\u4f55\u5339\u914d ML \u57fa\u7840\u8bbe\u65bd\u5c97\u4f4d\uff1f",
    },
  };

  var BETA_CHAT_HISTORY_KEY = "beta_chat_history";
  var history = [];
  var isWaiting = false;

  /* ---- DOM refs ---- */
  var chatZone = document.getElementById("chat-zone");
  var chatMessages = document.getElementById("chat-messages");
  var chatZoneBody = document.getElementById("chat-zone-body");
  var chatForm = document.getElementById("chat-form");
  var chatInput = document.getElementById("chat-input");
  var sendBtn = document.getElementById("send-btn");
  var charCount = document.getElementById("chat-char-count");
  var chatDisclaimer = document.getElementById("chat-disclaimer");
  var chatSuggestions = document.getElementById("chat-suggestions");
  var suggestionButtons = chatSuggestions ? Array.from(chatSuggestions.querySelectorAll(".suggestion-btn")) : [];
  var minimizeBtn = document.getElementById("chat-minimize-btn");
  var clearBtn = document.getElementById("chat-clear-btn");
  var dragHandle = document.getElementById("chat-zone-drag-handle");
  var resizeHandle = document.getElementById("chat-zone-resize-handle");

  /* ---- Helpers ---- */
  function currentLocale() { return getLocale(); }
  function t(key) { return UI_TEXT[currentLocale()][key] || UI_TEXT.en[key] || ""; }

  /**
   * Escape HTML special characters to prevent XSS when rendering markdown.
   * @param {string} str - Raw string.
   * @returns {string} HTML-safe string.
   */
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Apply inline markdown formatting (bold, italic, inline code).
   * Operates on already HTML-escaped text.
   * @param {string} text - Escaped line.
   * @returns {string} Line with inline HTML formatting.
   */
  function inlineFormat(text) {
    return text
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  /**
   * Convert a limited subset of markdown to sanitised HTML.
   * Handles: bold, italic, inline code, code blocks, lists, paragraphs.
   * Input is HTML-escaped first to prevent injection.
   * @param {string} src - Raw markdown text.
   * @returns {string} Sanitised HTML string.
   */
  function renderMarkdown(src) {
    var safe = escapeHtml(src);
    var lines = safe.split("\n");
    var out = [];
    var inList = "";
    var inCode = false;
    var codeBlock = [];

    function closePendingList() {
      if (inList === "ul") { out.push("</ul>"); }
      if (inList === "ol") { out.push("</ol>"); }
      inList = "";
    }

    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];

      if (/^```/.test(raw)) {
        if (inCode) {
          out.push("<pre><code>" + codeBlock.join("\n") + "</code></pre>");
          codeBlock = [];
          inCode = false;
        } else {
          closePendingList();
          inCode = true;
        }
        continue;
      }
      if (inCode) { codeBlock.push(raw); continue; }

      var ulMatch = raw.match(/^[\s]*[-*]\s+(.*)/);
      var olMatch = raw.match(/^[\s]*\d+\.\s+(.*)/);

      if (ulMatch) {
        if (inList !== "ul") { closePendingList(); out.push("<ul>"); inList = "ul"; }
        out.push("<li>" + inlineFormat(ulMatch[1]) + "</li>");
        continue;
      }
      if (olMatch) {
        if (inList !== "ol") { closePendingList(); out.push("<ol>"); inList = "ol"; }
        out.push("<li>" + inlineFormat(olMatch[1]) + "</li>");
        continue;
      }

      closePendingList();
      if (raw.trim() === "") { continue; }
      out.push("<p>" + inlineFormat(raw) + "</p>");
    }

    if (inCode && codeBlock.length) {
      out.push("<pre><code>" + codeBlock.join("\n") + "</code></pre>");
    }
    closePendingList();
    return out.join("");
  }

  /* ---- History persistence ---- */
  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(BETA_CHAT_HISTORY_KEY);
      history = raw ? JSON.parse(raw) : [];
    } catch (_e) {
      history = [];
    }
  }

  function saveHistory() {
    var trimmed = history.slice(-MAX_HISTORY_MESSAGES);
    sessionStorage.setItem(BETA_CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  }

  /**
   * Show the messages area when there is content to display.
   * Checks both history (persisted) and DOM children (transient typing indicator).
   */
  function updateMessagesVisibility() {
    if (chatZoneBody) {
      if (history.length > 0 || chatMessages.children.length > 0) {
        chatZoneBody.classList.add("has-messages");
      } else {
        chatZoneBody.classList.remove("has-messages");
      }
    }
  }

  /* ---- Message rendering ---- */
  function appendMessage(role, text, options) {
    options = options || {};
    var wrapper = document.createElement("div");
    wrapper.className = "chat-msg " + role + "-msg";

    var bubble = document.createElement("div");
    bubble.className = "msg-bubble";

    if (options.temporary) {
      wrapper.dataset.temporary = "true";
    }

    if (role === "typing") {
      bubble.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div>';
    } else if (role === "assistant" || role === "error") {
      bubble.innerHTML = renderMarkdown(text);
    } else {
      bubble.textContent = text;
    }

    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    updateMessagesVisibility();
    return wrapper;
  }

  function removeElement(el) {
    if (el && el.parentNode) { el.parentNode.removeChild(el); }
  }

  function renderHistory() {
    if (!chatMessages) { return; }
    chatMessages.innerHTML = "";
    if (history.length) {
      history.forEach(function (item) {
        appendMessage(item.role, item.content, item);
      });
    }
    updateMessagesVisibility();
  }

  /* ---- Chat submission ---- */
  function setBusy(busy) {
    isWaiting = busy;
    if (sendBtn) { sendBtn.disabled = busy; }
  }

  function updateCharCounter() {
    if (!charCount || !chatInput) { return; }
    charCount.textContent = chatInput.value.length + " / " + MAX_INPUT_LENGTH;
  }

  function submitMessage(text) {
    if (isWaiting || !text) { return; }

    appendMessage("user", text);
    history.push({ role: "user", content: text });
    saveHistory();
    chatInput.value = "";
    updateCharCounter();

    var typingEl = appendMessage("typing", t("thinking"));
    setBusy(true);

    fetch(BACKEND_URL + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: history.slice(0, -1),
        session_id: getSessionId(),
        happy_token: null,
      }),
    })
      .then(function (response) {
        removeElement(typingEl);
        if (!response.ok) {
          appendMessage("error", t("unavailable"));
          history.pop();
          saveHistory();
          return;
        }
        return response.json().then(function (data) {
          history.push({ role: "assistant", content: data.reply, blocked: data.blocked });
          saveHistory();
          appendMessage("assistant", data.reply, { blocked: data.blocked });

          if (chatSuggestions && history.length > 1) {
            chatSuggestions.style.display = "none";
          }
        });
      })
      .catch(function (err) {
        console.error(err);
        removeElement(typingEl);
        appendMessage("error", t("unreachable"));
        history.pop();
        saveHistory();
      })
      .finally(function () {
        setBusy(false);
        if (chatInput) { chatInput.focus(); }
      });
  }

  function onFormSubmit(event) {
    event.preventDefault();
    var message = chatInput.value.trim();
    if (message) { submitMessage(message); }
  }

  /* ---- Events ---- */
  if (chatForm) {
    chatForm.addEventListener("submit", onFormSubmit);
  }

  if (chatInput) {
    chatInput.addEventListener("input", updateCharCounter);
    chatInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onFormSubmit(event);
      }
    });
  }

  /* Suggestion buttons */
  suggestionButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var question = btn.getAttribute("data-question") || btn.textContent;
      submitMessage(question);
    });
  });

  /* Locale change re-renders suggestion text */
  function applyLocaleText() {
    if (chatInput) { chatInput.placeholder = t("placeholder"); }
    if (chatDisclaimer) { chatDisclaimer.textContent = t("disclaimer"); }

    /* Update suggestion button labels */
    var keys = ["suggestResearch", "suggestProjects", "suggestPublications", "suggestFit"];
    suggestionButtons.forEach(function (btn, i) {
      if (keys[i]) { btn.textContent = t(keys[i]); }
    });

    /* Update suggestion button data-question for localized questions */
    var questions = {
      en: [
        "What are your main research interests?",
        "What projects is he building now?",
        "Summarize his publications.",
        "How does this fit ML infra roles?",
      ],
      zh: [
        "\u4f60\u7684\u4e3b\u8981\u7814\u7a76\u65b9\u5411\u662f\u4ec0\u4e48\uff1f",
        "\u4ed6\u5728\u505a\u54ea\u4e9b\u9879\u76ee\uff1f",
        "\u603b\u7ed3\u4ed6\u7684\u8bba\u6587\u53d1\u8868\u3002",
        "\u5982\u4f55\u5339\u914d ML \u57fa\u7840\u8bbe\u65bd\u5c97\u4f4d\uff1f",
      ],
    };
    var locale = currentLocale();
    var localeQuestions = questions[locale] || questions.en;
    suggestionButtons.forEach(function (btn, i) {
      if (localeQuestions[i]) { btn.setAttribute("data-question", localeQuestions[i]); }
    });
  }

  /* Listen for locale changes triggered by beta-home.js */
  document.querySelectorAll(".beta-lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLocaleText();
      if (!history.length) { renderHistory(); }
    });
  });

  /* ---- Minimize / Expand ---- */
  function toggleMinimize() {
    if (!chatZone) { return; }
    var isMin = chatZone.classList.toggle("is-minimized");
    if (minimizeBtn) {
      minimizeBtn.title = isMin ? "Expand chat" : "Minimize chat";
      minimizeBtn.setAttribute("aria-label", isMin ? "Expand chat zone" : "Minimize chat zone");
    }
    if (!isMin && chatInput) { chatInput.focus(); }
  }

  if (minimizeBtn) {
    minimizeBtn.addEventListener("click", toggleMinimize);
  }

  /* ---- Clear session ---- */
  function clearSession() {
    history = [];
    sessionStorage.removeItem(BETA_CHAT_HISTORY_KEY);
    if (chatMessages) { chatMessages.innerHTML = ""; }
    updateMessagesVisibility();
    if (chatSuggestions) { chatSuggestions.style.display = ""; }
    if (chatZone) { chatZone.classList.remove("is-minimized"); }
    updateCharCounter();
    if (chatInput) { chatInput.focus(); }
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearSession);
  }

  /* ---- Drag to move ---- */
  (function initDrag() {
    if (!dragHandle || !chatZone) { return; }

    var isDragging = false;
    var offsetX = 0;
    var offsetY = 0;

    function onMouseDown(e) {
      if (e.button !== 0) { return; }
      e.preventDefault();
      isDragging = true;

      var rect = chatZone.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      /* Detach from fixed-bottom into positioned floating panel */
      if (!chatZone.classList.contains("is-detached")) {
        chatZone.classList.add("is-detached");
        chatZone.style.left = rect.left + "px";
        chatZone.style.top = rect.top + "px";
        chatZone.style.width = rect.width + "px";
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e) {
      if (!isDragging) { return; }
      var newLeft = e.clientX - offsetX;
      var newTop = e.clientY - offsetY;
      /* Clamp within viewport */
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - chatZone.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - 40));
      chatZone.style.left = newLeft + "px";
      chatZone.style.top = newTop + "px";
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    dragHandle.addEventListener("mousedown", onMouseDown);

    /* Double-click resets to docked position */
    dragHandle.addEventListener("dblclick", function () {
      chatZone.classList.remove("is-detached");
      chatZone.style.left = "";
      chatZone.style.top = "";
      chatZone.style.width = "";
    });
  })();

  /* ---- Resize (vertical) ---- */
  (function initResize() {
    if (!resizeHandle || !chatZoneBody) { return; }

    var isResizing = false;
    var startY = 0;
    var startMaxH = 0;

    function onMouseDown(e) {
      if (e.button !== 0) { return; }
      e.preventDefault();
      isResizing = true;
      startY = e.clientY;
      var style = window.getComputedStyle(chatZoneBody);
      startMaxH = parseInt(style.maxHeight, 10) || 240;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e) {
      if (!isResizing) { return; }
      /* Dragging upward increases height, downward decreases */
      var delta = startY - e.clientY;
      var newMaxH = Math.max(80, Math.min(startMaxH + delta, window.innerHeight * 0.6));
      chatZoneBody.style.maxHeight = newMaxH + "px";
    }

    function onMouseUp() {
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    resizeHandle.addEventListener("mousedown", onMouseDown);
  })();

  /* ---- Init ---- */
  loadHistory();
  renderHistory();
  updateCharCounter();
  applyLocaleText();
})();
