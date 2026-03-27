"use strict";

(function () {
  const {
    BACKEND_URL,
    MAX_HISTORY_MESSAGES,
    MAX_INPUT_LENGTH,
    STORAGE_KEYS,
    getLocale,
    getSessionId,
    isDesktopControlAvailable,
  } = window.PortfolioApp;

  const chatWindow = document.getElementById("chat-window");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const charCounter = document.getElementById("char-counter");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const bubbleRange = document.getElementById("bubble-width-range");
  const bubbleWidthValue = document.getElementById("bubble-width-value");
  const happyCard = document.getElementById("happy-card");
  const happyCodeForm = document.getElementById("happy-code-form");
  const happyAnswerForm = document.getElementById("happy-answer-form");
  const happyCodeInput = document.getElementById("happy-code-input");
  const happyAnswerInput = document.getElementById("happy-answer-input");
  const happyQuestionText = document.getElementById("happy-question-text");
  const happyMessage = document.getElementById("happy-message");
  const happyStatus = document.getElementById("happy-status");

  let history = loadHistory();
  let isWaiting = false;
  let happyToken = sessionStorage.getItem(STORAGE_KEYS.happyToken) || "";
  let happyModeEnabled = false;

  function currentLocale() {
    return getLocale();
  }

  function localizedGreeting() {
    if (currentLocale() === "zh") {
      return "你好，我是主页 AI 助手。我可以结合当前会话内容，回答关于公开项目、经历和研究方向的问题。";
    }
    return "Hello, I am the homepage AI assistant. I can use the current session history to answer questions about public projects, experience, and research.";
  }

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.chatHistory) || "[]");
    } catch {
      return [];
    }
  }

  function saveHistory() {
    history = history.slice(-MAX_HISTORY_MESSAGES);
    sessionStorage.setItem(STORAGE_KEYS.chatHistory, JSON.stringify(history));
  }

  function appendMessage(role, text, extra = {}) {
    const el = document.createElement("div");
    el.classList.add("message", role);
    if (extra.blocked) {
      el.classList.add("blocked");
    }
    el.textContent = text;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return el;
  }

  function renderHistory() {
    chatWindow.innerHTML = "";
    if (!history.length) {
      appendMessage("assistant", localizedGreeting());
      return;
    }
    history.forEach((item) => appendMessage(item.role, item.content, item));
  }

  function updateCharCounter() {
    const len = chatInput.value.length;
    charCounter.textContent = `${len} / ${MAX_INPUT_LENGTH}`;
    charCounter.className = "char-counter";
    if (len > MAX_INPUT_LENGTH * 0.9) {
      charCounter.classList.add("near-limit");
    }
    if (len >= MAX_INPUT_LENGTH) {
      charCounter.classList.add("over-limit");
    }
  }

  function setBusy(busy) {
    isWaiting = busy;
    sendBtn.disabled = busy;
    chatInput.disabled = busy;
  }

  function removeElement(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function applyBubbleWidth() {
    if (!bubbleRange || !bubbleWidthValue || !isDesktopControlAvailable()) {
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEYS.bubbleWidth);
    if (stored) {
      bubbleRange.value = stored;
    }
    const width = `${bubbleRange.value}vw`;
    bubbleWidthValue.textContent = width;
    document.documentElement.style.setProperty("--bubble-max-width", width);
  }

  function setHappyUnlocked(unlocked) {
    if (!happyCard) {
      return;
    }
    happyStatus.textContent = unlocked ? "Unlocked" : "Locked";
    happyStatus.classList.toggle("is-unlocked", unlocked);
  }

  async function submitChat(event) {
    event.preventDefault();
    if (isWaiting) {
      return;
    }

    const message = chatInput.value.trim();
    if (!message) {
      return;
    }

    appendMessage("user", message);
    history.push({ role: "user", content: message });
    saveHistory();
    chatInput.value = "";
    updateCharCounter();

    const typingEl = appendMessage("typing", currentLocale() === "zh" ? "正在思考..." : "Thinking...");
    setBusy(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.slice(0, -1),
          session_id: getSessionId(),
          happy_token: happyToken || null,
        }),
      });

      removeElement(typingEl);

      if (!response.ok) {
        appendMessage("error", currentLocale() === "zh"
          ? "助手暂时不可用，请稍后再试。"
          : "The assistant is unavailable right now. Please try again.");
        history.pop();
        saveHistory();
        return;
      }

      const data = await response.json();
      history.push({ role: "assistant", content: data.reply, blocked: data.blocked });
      saveHistory();
      appendMessage("assistant", data.reply, { blocked: data.blocked });
      if (data.happy_mode_active) {
        setHappyUnlocked(true);
      }
    } catch (error) {
      console.error(error);
      removeElement(typingEl);
      appendMessage("error", currentLocale() === "zh"
        ? "无法连接到助手，请检查网络。"
        : "Unable to reach the assistant. Please check your connection.");
      history.pop();
      saveHistory();
    } finally {
      setBusy(false);
      chatInput.focus();
    }
  }

  async function requestHappyChallenge(event) {
    event.preventDefault();
    happyMessage.textContent = "";
    try {
      const response = await fetch(`${BACKEND_URL}/api/happy/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: happyCodeInput.value,
          session_id: getSessionId(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        happyMessage.textContent = "wrong answer";
        return;
      }
      happyQuestionText.textContent = data.question;
      happyAnswerForm.hidden = false;
      happyMessage.textContent = currentLocale() === "zh"
        ? "请输入答案。"
        : "Please answer the question.";
    } catch (error) {
      console.error(error);
      happyMessage.textContent = currentLocale() === "zh"
        ? "暂时无法验证。"
        : "Unable to verify right now.";
    }
  }

  async function verifyHappyAnswer(event) {
    event.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/happy/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: happyCodeInput.value,
          answer: happyAnswerInput.value,
          session_id: getSessionId(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        happyMessage.textContent = "wrong answer";
        return;
      }
      happyToken = data.token;
      sessionStorage.setItem(STORAGE_KEYS.happyToken, happyToken);
      setHappyUnlocked(true);
      happyMessage.textContent = currentLocale() === "zh"
        ? "已为当前会话开启 happy personality。"
        : "Happy personality is active for this session.";
      happyAnswerForm.hidden = true;
    } catch (error) {
      console.error(error);
      happyMessage.textContent = currentLocale() === "zh"
        ? "暂时无法验证。"
        : "Unable to verify right now.";
    }
  }

  document.addEventListener("portfolio:content-ready", (event) => {
    const detail = event.detail || {};
    happyModeEnabled = Boolean(detail.capabilities && detail.capabilities.happy_mode_enabled);
    if (happyCard) {
      happyCard.hidden = !happyModeEnabled;
    }
    renderHistory();
  });

  document.addEventListener("portfolio:locale-changed", () => {
    renderHistory();
  });

  chatInput.addEventListener("input", updateCharCounter);
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  chatForm.addEventListener("submit", submitChat);

  clearHistoryBtn.addEventListener("click", () => {
    history = [];
    saveHistory();
    renderHistory();
  });

  if (bubbleRange) {
    bubbleRange.addEventListener("input", () => {
      localStorage.setItem(STORAGE_KEYS.bubbleWidth, bubbleRange.value);
      applyBubbleWidth();
    });
  }

  if (happyCodeForm) {
    happyCodeForm.addEventListener("submit", requestHappyChallenge);
  }

  if (happyAnswerForm) {
    happyAnswerForm.addEventListener("submit", verifyHappyAnswer);
  }

  setHappyUnlocked(Boolean(happyToken));
  applyBubbleWidth();
  updateCharCounter();
  renderHistory();
})();
