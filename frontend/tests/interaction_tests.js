"use strict";

/**
 * Frontend Interaction Tests
 *
 * Verify that the front-end DOM is rendered correctly both before and
 * after the backend acts on user interactions.  Each test mocks fetch()
 * inside an iframe so no running backend is needed.
 *
 * Inputs:  Iframes loading beta.html and index.html.
 * Outputs: Pass/fail assertions rendered in the host page.
 *
 * Common failure modes:
 *   - iframe cross-origin block   → serve via HTTP, not file://
 *   - fetch mock not intercepted  → test reports wrong DOM state
 */

var results = [];
var currentGroup = "";

function group(name) {
  currentGroup = name;
}

function assert(condition, description) {
  results.push({ pass: !!condition, description: description, group: currentGroup });
}

function renderResults() {
  var el = document.getElementById("results");
  var passed = results.filter(function (r) { return r.pass; }).length;
  var failed = results.filter(function (r) { return !r.pass; }).length;

  var html = "<p><strong>" + passed + " passed, " + failed + " failed</strong></p>";
  var lastGroup = "";
  results.forEach(function (r) {
    if (r.group !== lastGroup) {
      html += '<div class="group-title">' + r.group + "</div>";
      lastGroup = r.group;
    }
    var cls = r.pass ? "pass" : "fail";
    var label = r.pass ? "[PASS]" : "[FAIL]";
    html += '<div class="test-row ' + cls + '">' + label + " " + r.description + "</div>";
  });
  el.innerHTML = html;
}

/* ---------- Helpers ---------- */

/**
 * Install a mock fetch inside an iframe's window.
 * @param {Window} iframeWin - The iframe's contentWindow.
 * @param {function} handler - (url, options) => Promise<Response-like>
 */
function installFetchMock(iframeWin, handler) {
  iframeWin.fetch = function (url, options) {
    return handler(url, options || {});
  };
}

/**
 * Create a fake Response object compatible with the frontend JS.
 * @param {number} status
 * @param {object} body
 * @returns {{ ok: boolean, status: number, json: function }}
 */
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    statusText: status === 200 ? "OK" : status === 429 ? "Too Many Requests" : "Error",
    json: function () {
      return Promise.resolve(body);
    },
  };
}

/**
 * Wait for a condition to become true or timeout.
 * @param {function} conditionFn - returns truthy when ready
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function waitFor(conditionFn, timeoutMs) {
  timeoutMs = timeoutMs || 3000;
  return new Promise(function (resolve) {
    var start = Date.now();
    function poll() {
      if (conditionFn()) { return resolve(true); }
      if (Date.now() - start > timeoutMs) { return resolve(false); }
      setTimeout(poll, 50);
    }
    poll();
  });
}

/* ---------- Beta Page Tests ---------- */

var framesReady = 0;
var totalFrames = 2;

function onFrameDone() {
  framesReady += 1;
  if (framesReady === totalFrames) {
    renderResults();
  }
}

var betaFrame = document.getElementById("test-frame-beta");

betaFrame.addEventListener("load", function () {
  var win = betaFrame.contentWindow;
  var doc = betaFrame.contentDocument;

  /* ========== Group: Beta Chat – Optimistic UI Before Backend ========== */
  group("Beta Chat – Optimistic UI (before backend response)");

  /*
   * Strategy: mock fetch to delay the response, then immediately check
   * that the user message and typing indicator appear in the DOM before
   * the mock resolves.
   */
  var chatResolveFn = null;
  installFetchMock(win, function (url, options) {
    if (url.indexOf("/api/chat") !== -1) {
      return new Promise(function (resolve) {
        chatResolveFn = resolve;
      });
    }
    /* /api/content and /api/portfolio calls get empty-but-valid responses */
    if (url.indexOf("/api/content") !== -1) {
      return Promise.resolve(fakeResponse(200, {
        content: {
          hero_badge: { en: "Test", zh: "Test" },
          hero_title: { en: "Test Name", zh: "Test Name" },
          hero_summary: { en: "Test Headline", zh: "Test Headline" },
          about_paragraphs: [],
          research_items: [],
          contact_items: [],
          profile_name: { en: "", zh: "" },
          profile_headline: { en: "", zh: "" },
          profile_about_paragraphs: [],
          profile_education: [],
          profile_research_interests: [],
          profile_contact_items: [],
        },
      }));
    }
    if (url.indexOf("/api/portfolio") !== -1) {
      return Promise.resolve(fakeResponse(200, {
        profile: { name: { en: "Test" }, education: [] },
        experience: {},
        projects: {},
        publications: {},
      }));
    }
    if (url.indexOf("/api/resume/info") !== -1) {
      return Promise.resolve(fakeResponse(200, { available: false }));
    }
    return Promise.resolve(fakeResponse(200, {}));
  });

  /* Simulate typing a message and submitting */
  var chatInput = doc.getElementById("chat-input");
  var chatForm = doc.getElementById("chat-form");
  var chatMessages = doc.getElementById("chat-messages");
  var sendBtn = doc.getElementById("send-btn");

  /* Set input value and trigger input event to enable send button */
  if (chatInput) {
    chatInput.value = "Hello test message";
    chatInput.dispatchEvent(new win.Event("input", { bubbles: true }));
  }

  /* Verify send button is enabled after typing */
  assert(sendBtn && !sendBtn.disabled, "beta: send button enabled after typing");

  /* Submit the form */
  if (chatForm) {
    chatForm.dispatchEvent(new win.Event("submit", { cancelable: true }));
  }

  /* Check optimistic UI: user message should appear immediately */
  setTimeout(function () {
    var userMsgs = chatMessages ? chatMessages.querySelectorAll(".user-msg") : [];
    assert(userMsgs.length >= 1, "beta: user message appears in DOM immediately after submit (optimistic UI)");

    /* Typing indicator should be visible while waiting for backend */
    var typingIndicator = chatMessages ? chatMessages.querySelectorAll(".typing-msg") : [];
    assert(typingIndicator.length >= 1, "beta: typing indicator shown while waiting for backend");

    /* Input should be cleared */
    assert(chatInput && chatInput.value === "", "beta: chat input cleared after submit");

    /* Send button should be disabled while waiting */
    assert(sendBtn && sendBtn.disabled, "beta: send button disabled while waiting for response");

    /* ========== Group: Beta Chat – After Backend Success ========== */
    group("Beta Chat – After backend success response");

    /* Now resolve the pending fetch with a success response */
    if (chatResolveFn) {
      chatResolveFn(fakeResponse(200, {
        reply: "This is a **test** assistant reply.",
        blocked: false,
      }));
    }

    /* Wait for the DOM to update after the response */
    waitFor(function () {
      var assistantMsgs = chatMessages ? chatMessages.querySelectorAll(".assistant-msg") : [];
      return assistantMsgs.length >= 1;
    }, 2000).then(function (found) {
      assert(found, "beta: assistant message appears after backend 200 response");

      /* Typing indicator should be removed */
      var typingAfter = chatMessages ? chatMessages.querySelectorAll(".typing-msg") : [];
      assert(typingAfter.length === 0, "beta: typing indicator removed after response");

      /* The assistant message should contain rendered markdown */
      var lastAssistant = chatMessages ? chatMessages.querySelector(".assistant-msg:last-child .msg-bubble") : null;
      var hasHtml = lastAssistant && lastAssistant.innerHTML.indexOf("<strong>") !== -1;
      assert(hasHtml, "beta: assistant reply renders markdown (bold) via innerHTML");

      /* Send button stays disabled when input is empty (ChatGPT pattern) */
      assert(sendBtn && sendBtn.disabled, "beta: send button stays disabled when input empty after response (ChatGPT pattern)");

      /* ========== Group: Beta Chat – Error Response ========== */
      group("Beta Chat – Error response handling");

      /* Set up a new mock that returns 429 */
      installFetchMock(win, function (url) {
        if (url.indexOf("/api/chat") !== -1) {
          return Promise.resolve(fakeResponse(429, {}));
        }
        return Promise.resolve(fakeResponse(200, {}));
      });

      /* Submit another message */
      chatInput.value = "Rate limited message";
      chatInput.dispatchEvent(new win.Event("input", { bubbles: true }));
      chatForm.dispatchEvent(new win.Event("submit", { cancelable: true }));

      waitFor(function () {
        var errorMsgs = chatMessages ? chatMessages.querySelectorAll(".error-msg") : [];
        return errorMsgs.length >= 1;
      }, 2000).then(function (foundError) {
        assert(foundError, "beta: error message shown after 429 (rate limited) response");

        /* ========== Group: Beta Chat – Network Error ========== */
        group("Beta Chat – Network error handling");

        installFetchMock(win, function (url) {
          if (url.indexOf("/api/chat") !== -1) {
            return Promise.reject(new Error("Network failure"));
          }
          return Promise.resolve(fakeResponse(200, {}));
        });

        chatInput.value = "Unreachable message";
        chatInput.dispatchEvent(new win.Event("input", { bubbles: true }));
        chatForm.dispatchEvent(new win.Event("submit", { cancelable: true }));

        waitFor(function () {
          var errorMsgs = chatMessages ? chatMessages.querySelectorAll(".error-msg") : [];
          return errorMsgs.length >= 2;
        }, 2000).then(function (foundNetError) {
          assert(foundNetError, "beta: error message shown after network failure (unreachable)");

          /* ========== Group: Beta Chat – Suggestion Chips ========== */
          group("Beta Chat – Suggestion chip interaction");

          var suggestionBtns = doc.querySelectorAll(".suggestion-btn");
          assert(suggestionBtns.length >= 3, "beta: at least 3 suggestion buttons present");

          /* Suggestion buttons should have data-question attributes */
          var firstSuggestion = suggestionBtns.length > 0 ? suggestionBtns[0] : null;
          assert(
            firstSuggestion && firstSuggestion.getAttribute("data-question"),
            "beta: suggestion buttons have data-question attributes"
          );

          /* ========== Group: Beta Chat – Inline Clear Pill ========== */
          group("Beta Chat – Inline clear pill");

          var clearPill = doc.querySelector(".chat-clear-pill");
          assert(clearPill !== null, "beta: inline clear pill button exists inside chat body");
          assert(doc.getElementById("chat-minimize-btn") === null, "beta: no separate minimize button (removed for cleaner UI)");

          onFrameDone();
        });
      });
    });
  }, 100);
});

/* ---------- Index Page Tests ---------- */

var indexFrame = document.getElementById("test-frame-index");

indexFrame.addEventListener("load", function () {
  var win = indexFrame.contentWindow;
  var doc = indexFrame.contentDocument;

  /* ========== Group: Index Chat – Optimistic UI ========== */
  group("Index Chat – Optimistic UI (before backend response)");

  var indexChatResolveFn = null;
  installFetchMock(win, function (url) {
    if (url.indexOf("/api/chat") !== -1) {
      return new Promise(function (resolve) {
        indexChatResolveFn = resolve;
      });
    }
    if (url.indexOf("/api/content") !== -1) {
      return Promise.resolve(fakeResponse(200, {
        content: {
          hero_badge: { en: "Test", zh: "Test" },
          hero_title: { en: "Test Name", zh: "Test Name" },
          hero_summary: { en: "Test Headline", zh: "Test Headline" },
          about_title: { en: "About", zh: "About" },
          research_title: { en: "Research", zh: "Research" },
          education_title: { en: "Education", zh: "Education" },
          contact_title: { en: "Contact", zh: "Contact" },
          about_paragraphs: [],
          research_items: [],
          education_items: [],
          contact_items: [],
          capabilities: {},
          profile_name: { en: "", zh: "" },
          profile_headline: { en: "", zh: "" },
          profile_about_paragraphs: [],
          profile_education: [],
          profile_research_interests: [],
          profile_contact_items: [],
        },
      }));
    }
    if (url.indexOf("/api/portfolio") !== -1) {
      return Promise.resolve(fakeResponse(200, {
        profile: { name: { en: "Test" }, education: [] },
        experience: {},
        projects: {},
        publications: {},
      }));
    }
    if (url.indexOf("/api/comments") !== -1) {
      return Promise.resolve(fakeResponse(200, { comments: [], total: 0 }));
    }
    return Promise.resolve(fakeResponse(200, {}));
  });

  /* The index chat widget is initially hidden; we simulate opening it */
  var chatToggle = doc.getElementById("chat-toggle");
  var chatWidget = doc.getElementById("chat-widget");
  var chatInput = doc.getElementById("chat-input");
  var chatForm = doc.getElementById("chat-form");
  var chatWindow = doc.getElementById("chat-window");

  /* Open the chat widget */
  if (chatToggle) { chatToggle.click(); }

  setTimeout(function () {
    /* Type a message */
    if (chatInput) {
      chatInput.value = "Hello from index";
      chatInput.dispatchEvent(new win.Event("input", { bubbles: true }));
    }

    /* Submit */
    if (chatForm) {
      chatForm.dispatchEvent(new win.Event("submit", { cancelable: true }));
    }

    setTimeout(function () {
      /* Check optimistic UI */
      var userMsgs = chatWindow ? chatWindow.querySelectorAll(".user") : [];
      assert(userMsgs.length >= 1, "index: user message appears immediately after submit");

      /* Input should be cleared */
      assert(chatInput && chatInput.value === "", "index: chat input cleared after submit");

      /* ========== Group: Index Chat – After Backend Success ========== */
      group("Index Chat – After backend success response");

      /* Resolve the mock */
      if (indexChatResolveFn) {
        indexChatResolveFn(fakeResponse(200, {
          reply: "Index assistant reply with **bold**.",
          blocked: false,
          happy_mode_active: false,
        }));
      }

      waitFor(function () {
        var assistantMsgs = chatWindow ? chatWindow.querySelectorAll(".assistant") : [];
        return assistantMsgs.length >= 2; /* greeting + response */
      }, 2000).then(function (found) {
        assert(found, "index: assistant message appears after backend 200 response");

        /* The assistant message should contain rendered markdown */
        var assistants = chatWindow ? chatWindow.querySelectorAll(".assistant") : [];
        var lastAssistant = assistants.length > 0 ? assistants[assistants.length - 1] : null;
        var hasHtml = lastAssistant && lastAssistant.innerHTML.indexOf("<strong>") !== -1;
        assert(hasHtml, "index: assistant reply renders markdown (bold) via innerHTML");

        /* ========== Group: Index Chat – Error Response ========== */
        group("Index Chat – Error response handling");

        installFetchMock(win, function (url) {
          if (url.indexOf("/api/chat") !== -1) {
            return Promise.resolve(fakeResponse(500, {}));
          }
          return Promise.resolve(fakeResponse(200, {}));
        });

        chatInput.value = "Error test";
        chatInput.dispatchEvent(new win.Event("input", { bubbles: true }));
        chatForm.dispatchEvent(new win.Event("submit", { cancelable: true }));

        waitFor(function () {
          var errorMsgs = chatWindow ? chatWindow.querySelectorAll(".error") : [];
          return errorMsgs.length >= 1;
        }, 2000).then(function (foundError) {
          assert(foundError, "index: error message shown after 500 response");

          /* ========== Group: Index Chat – Network Error ========== */
          group("Index Chat – Network error handling");

          installFetchMock(win, function (url) {
            if (url.indexOf("/api/chat") !== -1) {
              return Promise.reject(new Error("Network failure"));
            }
            return Promise.resolve(fakeResponse(200, {}));
          });

          chatInput.value = "Network error test";
          chatInput.dispatchEvent(new win.Event("input", { bubbles: true }));
          chatForm.dispatchEvent(new win.Event("submit", { cancelable: true }));

          waitFor(function () {
            var errorMsgs = chatWindow ? chatWindow.querySelectorAll(".error") : [];
            return errorMsgs.length >= 2;
          }, 2000).then(function (foundNetError) {
            assert(foundNetError, "index: error message shown after network failure");

            onFrameDone();
          });
        });
      });
    }, 100);
  }, 200);
});
