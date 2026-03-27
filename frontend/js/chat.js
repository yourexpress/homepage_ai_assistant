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

  const UI_TEXT = {
    en: {
      chatToggle: "AI",
      chatToggleLabel: "Open AI chat",
      chatLabel: "AI Chat",
      chatTitle: "Ask the assistant",
      close: "Close",
      clearHistory: "Clear session",
      send: "Send",
      greeting:
        "Hello, I am the homepage AI assistant. I can use the current session history to answer questions about public projects, experience, and research.",
      thinking: "Thinking...",
      assistantUnavailable: "The assistant is unavailable right now. Please try again.",
      assistantUnreachable: "Unable to reach the assistant. Please check your connection.",
      chatPlaceholder: "Ask about projects, research, experience, or fit.",
      chatDisclaimer: "The assistant keeps context only for this browser session.",
      happyToggle: "Private",
      happyToggleLabel: "Open private entrance",
      happyLabel: "Private entrance",
      happyTitle: "Unlock happy personality",
      happyLocked: "Locked",
      happyUnlocked: "Unlocked",
      happyCodePlaceholder: "Enter special code",
      happyCheckCode: "Check code",
      happyAnswerPlaceholder: "Answer here",
      happyUnlock: "Unlock",
      happyPrompt:
        "This mode only unlocks for a private visitor after the correct code and answer are provided.",
      happyEnterAnswer: "Please answer the question.",
      happyActive: "Happy personality is active for this session.",
      happyDeactivate: "Turn off",
      happyDeactivated: "Happy personality has been turned off for this session.",
      happyUnavailable: "Unable to verify right now.",
      wrongAnswer: "wrong answer",
      questionFallback: "Question",
    },
    zh: {
      chatToggle: "AI",
      chatToggleLabel: "打开 AI 对话",
      chatLabel: "AI 对话",
      chatTitle: "和助手交流",
      close: "关闭",
      clearHistory: "清空会话",
      send: "发送",
      greeting:
        "你好，我是主页 AI 助手。我可以结合当前会话历史，回答关于公开项目、经历和研究方向的问题。",
      thinking: "正在思考…",
      assistantUnavailable: "助手暂时不可用，请稍后再试。",
      assistantUnreachable: "暂时无法连接到助手，请检查网络或后端配置。",
      chatPlaceholder: "欢迎询问项目、研究方向、经历或岗位匹配度。",
      chatDisclaimer: "助手只会在当前浏览器会话中保留上下文。",
      happyToggle: "私密",
      happyToggleLabel: "打开私密入口",
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
      questionFallback: "问题",
    },
  };

  const CHAT_OPEN_KEY = "portfolio_chat_widget_open";
  const HAPPY_OPEN_KEY = "portfolio_happy_widget_open";
  const CHAT_WIDTH_KEY = "portfolio_chat_widget_width";
  const CHAT_HEIGHT_KEY = "portfolio_chat_widget_height";
  const CHAT_MIN_WIDTH = 320;
  const CHAT_MIN_HEIGHT = 360;

  const chatToggle = document.getElementById("chat-toggle");
  const chatWidget = document.getElementById("chat-widget");
  const chatResizeHandle = document.getElementById("chat-resize-handle");
  const chatCloseBtn = document.getElementById("chat-close-btn");
  const chatClearBtn = document.getElementById("chat-clear-btn");
  const chatLabel = document.getElementById("chat-widget-label");
  const chatTitle = document.getElementById("chat-widget-title");
  const chatWindow = document.getElementById("chat-window");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const charCounter = document.getElementById("char-counter");
  const chatDisclaimer = document.getElementById("chat-disclaimer");

  const happyToggle = document.getElementById("happy-toggle");
  const happyWidget = document.getElementById("happy-widget");
  const happyDeactivateBtn = document.getElementById("happy-deactivate-btn");
  const happyCloseBtn = document.getElementById("happy-close-btn");
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
  let happyMessageKey = happyToken ? "happyActive" : "happyPrompt";
  let resizeState = null;

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

  function isChatWidgetOpen() {
    return sessionStorage.getItem(CHAT_OPEN_KEY) === "true";
  }

  function isHappyWidgetOpen() {
    return sessionStorage.getItem(HAPPY_OPEN_KEY) === "true";
  }

  function setChatWidgetOpen(open) {
    sessionStorage.setItem(CHAT_OPEN_KEY, open ? "true" : "false");
    chatWidget.hidden = !open;
    chatToggle.classList.toggle("is-hidden", open);
    chatToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      applyStoredChatSize();
      chatInput.focus();
    }
  }

  function setHappyWidgetOpen(open) {
    if (!happyModeEnabled) {
      happyWidget.hidden = true;
      happyToggle.hidden = true;
      return;
    }
    sessionStorage.setItem(HAPPY_OPEN_KEY, open ? "true" : "false");
    happyWidget.hidden = !open;
    happyToggle.hidden = false;
    happyToggle.classList.toggle("is-hidden", open);
    happyToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      happyCodeInput.focus();
    }
  }

  function setBusy(busy) {
    isWaiting = busy;
    sendBtn.disabled = busy;
    chatInput.disabled = busy;
    chatClearBtn.disabled = busy;
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

  function setHappyMessage(key) {
    happyMessageKey = key;
    happyMessage.textContent = t(key);
  }

  function setHappyUnlocked(unlocked) {
    happyStatus.textContent = unlocked ? t("happyUnlocked") : t("happyLocked");
    happyStatus.classList.toggle("is-unlocked", unlocked);
    happyDeactivateBtn.hidden = !unlocked;
  }

  function resetHappyForms() {
    happyCodeForm.reset();
    happyAnswerForm.reset();
    happyAnswerForm.hidden = true;
    happyQuestionText.textContent = t("questionFallback");
    setHappyMessage(happyToken ? "happyActive" : "happyPrompt");
    setHappyUnlocked(Boolean(happyToken));
  }

  function clearSessionContext() {
    history = [];
    sessionStorage.removeItem(STORAGE_KEYS.chatHistory);
    sessionStorage.removeItem(STORAGE_KEYS.sessionId);
    sessionStorage.removeItem(STORAGE_KEYS.happyToken);
    happyToken = "";
    resetHappyForms();
    renderHistory();
    chatInput.value = "";
    updateCharCounter();
    getSessionId();
  }

  function deactivateHappyMode() {
    sessionStorage.removeItem(STORAGE_KEYS.happyToken);
    happyToken = "";
    sessionStorage.removeItem(STORAGE_KEYS.chatHistory);
    sessionStorage.removeItem(STORAGE_KEYS.sessionId);
    history = [];
    resetHappyForms();
    setHappyMessage("happyDeactivated");
    renderHistory();
    getSessionId();
  }

  function applyUiText() {
    chatToggle.textContent = t("chatToggle");
    chatToggle.setAttribute("aria-label", t("chatToggleLabel"));
    chatLabel.textContent = t("chatLabel");
    chatTitle.textContent = t("chatTitle");
    chatCloseBtn.textContent = t("close");
    chatClearBtn.textContent = t("clearHistory");
    sendBtn.textContent = t("send");
    chatInput.placeholder = t("chatPlaceholder");
    chatDisclaimer.textContent = t("chatDisclaimer");

    happyToggle.textContent = t("happyToggle");
    happyToggle.setAttribute("aria-label", t("happyToggleLabel"));
    happyLabel.textContent = t("happyLabel");
    happyTitle.textContent = t("happyTitle");
    happyDeactivateBtn.textContent = t("happyDeactivate");
    happyCloseBtn.textContent = t("close");
    happyCodeInput.placeholder = t("happyCodePlaceholder");
    happyCodeSubmit.textContent = t("happyCheckCode");
    happyAnswerInput.placeholder = t("happyAnswerPlaceholder");
    happyAnswerSubmit.textContent = t("happyUnlock");

    happyMessage.textContent = t(happyMessageKey);
    setHappyUnlocked(Boolean(happyToken));
  }

  function clampChatSize(width, height) {
    const maxWidth = Math.min(520, window.innerWidth - 32);
    const maxHeight = Math.min(760, window.innerHeight - 48);

    return {
      width: Math.max(CHAT_MIN_WIDTH, Math.min(width, maxWidth)),
      height: Math.max(CHAT_MIN_HEIGHT, Math.min(height, maxHeight)),
    };
  }

  function applyChatSize(width, height) {
    if (!isDesktopControlAvailable()) {
      chatWidget.style.width = "";
      chatWidget.style.height = "";
      return;
    }

    const next = clampChatSize(width, height);
    chatWidget.style.width = `${next.width}px`;
    chatWidget.style.height = `${next.height}px`;
    sessionStorage.setItem(CHAT_WIDTH_KEY, String(Math.round(next.width)));
    sessionStorage.setItem(CHAT_HEIGHT_KEY, String(Math.round(next.height)));
  }

  function applyStoredChatSize() {
    if (!isDesktopControlAvailable()) {
      chatWidget.style.width = "";
      chatWidget.style.height = "";
      return;
    }

    const storedWidth = Number.parseInt(sessionStorage.getItem(CHAT_WIDTH_KEY) || "", 10);
    const storedHeight = Number.parseInt(sessionStorage.getItem(CHAT_HEIGHT_KEY) || "", 10);
    if (Number.isFinite(storedWidth) && Number.isFinite(storedHeight)) {
      applyChatSize(storedWidth, storedHeight);
    }
  }

  function onResizeMove(event) {
    if (!resizeState) {
      return;
    }
    const nextWidth = resizeState.startWidth + (resizeState.startX - event.clientX);
    const nextHeight = resizeState.startHeight + (resizeState.startY - event.clientY);
    applyChatSize(nextWidth, nextHeight);
  }

  function stopResize() {
    resizeState = null;
    document.body.classList.remove("is-resizing-chat");
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", stopResize);
  }

  function startResize(event) {
    if (!isDesktopControlAvailable() || chatWidget.hidden) {
      return;
    }
    event.preventDefault();
    const rect = chatWidget.getBoundingClientRect();
    resizeState = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    document.body.classList.add("is-resizing-chat");
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", stopResize);
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

    setChatWidgetOpen(true);
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
        setHappyMessage("happyActive");
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
        setHappyMessage("wrongAnswer");
        return;
      }
      happyQuestionText.textContent = data.question || t("questionFallback");
      happyAnswerForm.hidden = false;
      setHappyMessage("happyEnterAnswer");
    } catch (error) {
      console.error(error);
      setHappyMessage("happyUnavailable");
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
        setHappyMessage("wrongAnswer");
        return;
      }
      happyToken = data.token;
      sessionStorage.setItem(STORAGE_KEYS.happyToken, happyToken);
      happyAnswerForm.hidden = true;
      setHappyUnlocked(true);
      setHappyMessage("happyActive");
    } catch (error) {
      console.error(error);
      setHappyMessage("happyUnavailable");
    }
  }

  document.addEventListener("portfolio:content-ready", (event) => {
    const detail = event.detail || {};
    happyModeEnabled = Boolean(detail.capabilities && detail.capabilities.happy_mode_enabled);
    if (!happyModeEnabled) {
      setHappyWidgetOpen(false);
      happyToggle.hidden = true;
    } else {
      happyToggle.hidden = false;
      setHappyWidgetOpen(isHappyWidgetOpen());
    }
    applyUiText();
    renderHistory();
  });

  document.addEventListener("portfolio:locale-changed", () => {
    applyUiText();
    renderHistory();
  });

  chatToggle.addEventListener("click", () => setChatWidgetOpen(true));
  chatCloseBtn.addEventListener("click", () => setChatWidgetOpen(false));
  chatClearBtn.addEventListener("click", clearSessionContext);
  chatResizeHandle.addEventListener("mousedown", startResize);

  happyToggle.addEventListener("click", () => setHappyWidgetOpen(true));
  happyDeactivateBtn.addEventListener("click", deactivateHappyMode);
  happyCloseBtn.addEventListener("click", () => setHappyWidgetOpen(false));

  chatInput.addEventListener("input", updateCharCounter);
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  window.addEventListener("resize", () => {
    if (chatWidget.hidden) {
      return;
    }
    applyStoredChatSize();
  });

  chatForm.addEventListener("submit", submitChat);
  happyCodeForm.addEventListener("submit", requestHappyChallenge);
  happyAnswerForm.addEventListener("submit", verifyHappyAnswer);

  applyUiText();
  updateCharCounter();
  renderHistory();
  resetHappyForms();
  setChatWidgetOpen(isChatWidgetOpen());
})();
