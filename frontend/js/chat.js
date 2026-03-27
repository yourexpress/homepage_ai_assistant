"use strict";

(function () {
  const {
    BACKEND_URL,
    MAX_HISTORY_MESSAGES,
    MAX_INPUT_LENGTH,
    STORAGE_KEYS,
    getLocale,
    getSessionId,
  } = window.PortfolioApp;

  const UI_TEXT = {
    en: {
      chatToggle: "AI Chat",
      chatLabel: "AI Chat",
      chatTitle: "Ask the assistant",
      close: "Close",
      greeting: "Hello, I am the homepage AI assistant. I can use the current session history to answer questions about public projects, experience, and research.",
      thinking: "Thinking...",
      assistantUnavailable: "The assistant is unavailable right now. Please try again.",
      assistantUnreachable: "Unable to reach the assistant. Please check your connection.",
      chatPlaceholder: "Ask about projects, research, experience, or fit.",
      chatDisclaimer: "The assistant keeps context only for this browser session.",
      clearHistory: "Clear session",
      happyLabel: "Private entrance",
      happyTitle: "Unlock happy personality",
      happyLocked: "Locked",
      happyUnlocked: "Unlocked",
      happyCodePlaceholder: "Enter special code",
      happyCheckCode: "Check code",
      happyAnswerPlaceholder: "Answer here",
      happyUnlock: "Unlock",
      happyPrompt: "This mode only unlocks for a private visitor after the correct code and answer are provided.",
      happyEnterAnswer: "Please answer the question.",
      happyActive: "Happy personality is active for this session.",
      happyUnavailable: "Unable to verify right now.",
      wrongAnswer: "wrong answer",
    },
    zh: {
      chatToggle: "AI 对话",
      chatLabel: "AI 对话",
      chatTitle: "和助手交流",
      close: "关闭",
      greeting: "你好，我是主页 AI 助手。我可以结合当前会话内容，回答关于公开项目、经历和研究方向的问题。",
      thinking: "正在思考……",
      assistantUnavailable: "助手暂时不可用，请稍后再试。",
      assistantUnreachable: "暂时无法连接到助手，请检查网络或后端配置。",
      chatPlaceholder: "欢迎询问项目、研究方向、经历或岗位匹配度。",
      chatDisclaimer: "助手只会在当前浏览器会话中保留上下文。",
      clearHistory: "清空会话",
      happyLabel: "私密入口",
      happyTitle: "开启 happy personality",
      happyLocked: "未开启",
      happyUnlocked: "已开启",
      happyCodePlaceholder: "输入特别代码",
      happyCheckCode: "检查代码",
      happyAnswerPlaceholder: "请输入答案",
      happyUnlock: "开启",
      happyPrompt: "只有私密访客在输入正确代码和答案后才能开启该模式。",
      happyEnterAnswer: "请输入答案。",
      happyActive: "当前会话已开启 happy personality。",
      happyUnavailable: "暂时无法验证，请稍后再试。",
      wrongAnswer: "wrong answer",
    },
  };

  const WIDGET_STORAGE_KEY = "portfolio_chat_widget_open";

  const chatToggle = document.getElementById("chat-toggle");
  const chatWidget = document.getElementById("chat-widget");
  const chatCloseBtn = document.getElementById("chat-close-btn");
  const chatLabel = document.getElementById("chat-widget-label");
  const chatTitle = document.getElementById("chat-widget-title");
  const chatWindow = document.getElementById("chat-window");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const charCounter = document.getElementById("char-counter");
  const chatDisclaimer = document.getElementById("chat-disclaimer");
  const happyCard = document.getElementById("happy-card");
  const happyCodeForm = document.getElementById("happy-code-form");
  const happyAnswerForm = document.getElementById("happy-answer-form");
  const happyCodeInput = document.getElementById("happy-code-input");
  const happyAnswerInput = document.getElementById("happy-answer-input");
  const happyQuestionText = document.getElementById("happy-question-text");
  const happyMessage = document.getElementById("happy-message");
  const happyStatus = document.getElementById("happy-status");
  const happyLabel = document.getElementById("happy-label");
  const happyTitle = document.getElementById("happy-title");
  const happyCodeSubmit = document.getElementById("happy-code-submit");
  const happyAnswerSubmit = document.getElementById("happy-answer-submit");

  let history = loadHistory();
  let isWaiting = false;
  let happyToken = sessionStorage.getItem(STORAGE_KEYS.happyToken) || "";
  let happyModeEnabled = false;

  function currentLocale() {
    return getLocale();
  }

  function t(key) {
    return UI_TEXT[currentLocale()][key] || UI_TEXT.en[key] || "";
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

  function isWidgetOpen() {
    return sessionStorage.getItem(WIDGET_STORAGE_KEY) === "true";
  }

  function setWidgetOpen(open) {
    sessionStorage.setItem(WIDGET_STORAGE_KEY, open ? "true" : "false");
    chatWidget.hidden = !open;
    chatToggle.classList.toggle("is-hidden", open);
    chatToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      chatInput.focus();
    }
  }

  function setBusy(busy) {
    isWaiting = busy;
    sendBtn.disabled = busy;
    chatInput.disabled = busy;
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

  function removeElement(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
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
      appendMessage("assistant", t("greeting"));
      return;
    }
    history.forEach((item) => appendMessage(item.role, item.content, item));
  }

  function applyUiText() {
    chatToggle.textContent = t("chatToggle");
    chatLabel.textContent = t("chatLabel");
    chatTitle.textContent = t("chatTitle");
    chatCloseBtn.textContent = t("close");
    chatInput.placeholder = t("chatPlaceholder");
    chatDisclaimer.textContent = t("chatDisclaimer");
    happyLabel.textContent = t("happyLabel");
    happyTitle.textContent = t("happyTitle");
    happyCodeInput.placeholder = t("happyCodePlaceholder");
    happyCodeSubmit.textContent = t("happyCheckCode");
    happyAnswerInput.placeholder = t("happyAnswerPlaceholder");
    happyAnswerSubmit.textContent = t("happyUnlock");
    if (!happyMessage.textContent) {
      happyMessage.textContent = t("happyPrompt");
    }
    setHappyUnlocked(Boolean(happyToken));
  }

  function setHappyUnlocked(unlocked) {
    happyStatus.textContent = unlocked ? t("happyUnlocked") : t("happyLocked");
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

    setWidgetOpen(true);
    appendMessage("user", message);
    history.push({ role: "user", content: message });
    saveHistory();
    chatInput.value = "";
    updateCharCounter();

    const typingEl = appendMessage("typing", t("thinking"));
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
        appendMessage("error", t("assistantUnavailable"));
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
      appendMessage("error", t("assistantUnreachable"));
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
        happyMessage.textContent = t("wrongAnswer");
        return;
      }
      happyQuestionText.textContent = data.question;
      happyAnswerForm.hidden = false;
      happyMessage.textContent = t("happyEnterAnswer");
    } catch (error) {
      console.error(error);
      happyMessage.textContent = t("happyUnavailable");
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
        happyMessage.textContent = t("wrongAnswer");
        return;
      }
      happyToken = data.token;
      sessionStorage.setItem(STORAGE_KEYS.happyToken, happyToken);
      setHappyUnlocked(true);
      happyMessage.textContent = t("happyActive");
      happyAnswerForm.hidden = true;
    } catch (error) {
      console.error(error);
      happyMessage.textContent = t("happyUnavailable");
    }
  }

  document.addEventListener("portfolio:content-ready", (event) => {
    const detail = event.detail || {};
    happyModeEnabled = Boolean(detail.capabilities && detail.capabilities.happy_mode_enabled);
    happyCard.hidden = !happyModeEnabled;
    applyUiText();
    renderHistory();
  });

  document.addEventListener("portfolio:locale-changed", () => {
    applyUiText();
    renderHistory();
  });

  chatToggle.addEventListener("click", () => setWidgetOpen(true));
  chatCloseBtn.addEventListener("click", () => setWidgetOpen(false));

  chatInput.addEventListener("input", updateCharCounter);
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  chatForm.addEventListener("submit", submitChat);

  if (happyCodeForm) {
    happyCodeForm.addEventListener("submit", requestHappyChallenge);
  }

  if (happyAnswerForm) {
    happyAnswerForm.addEventListener("submit", verifyHappyAnswer);
  }

  applyUiText();
  updateCharCounter();
  renderHistory();
  setWidgetOpen(isWidgetOpen());
})();
