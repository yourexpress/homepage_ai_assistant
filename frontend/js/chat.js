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
      clearHistory: "Clear",
      send: "Send",
      greeting:
        "Hello, I am the homepage AI assistant. I can use the current session history to answer questions about public projects, experience, and research.",
      thinking: "Thinking...",
      assistantUnavailable: "The assistant is unavailable right now. Please try again.",
      assistantUnreachable: "Unable to reach the assistant. Please check your connection.",
      chatPlaceholder: "Ask about projects, research, experience, or fit.",
      chatDisclaimer: "The assistant keeps context only for this browser session.",
      happyToggle: "Private",
      happyToggleLabel: "Open private code dock",
      happyCodePlaceholder: "Enter happy code",
      happyCheckCode: "Unlock",
      happyDockPrompt: "Enter the private code here. The question will continue inside the chat bubble.",
      happyDockReady: "Code accepted. Continue in the chat bubble.",
      happyModeChip: "Happy mode",
      happyWaitingChip: "Private question",
      happyPromptLead: "Private question:",
      happyAnswerPlaceholder: "Answer the private question here.",
      happyActive: "Happy personality is active for this session.",
      happyUnavailable: "Unable to verify right now.",
      wrongAnswerThumbDown: "wrong answer, thumb down",
    },
    zh: {
      chatToggle: "AI",
      chatToggleLabel: "打开 AI 对话",
      chatLabel: "AI 对话",
      chatTitle: "和助手交流",
      close: "关闭",
      clearHistory: "清空",
      send: "发送",
      greeting:
        "你好，我是主页 AI 助手。我可以结合当前会话历史，回答关于公开项目、经历和研究方向的问题。",
      thinking: "正在思考...",
      assistantUnavailable: "助手暂时不可用，请稍后再试。",
      assistantUnreachable: "暂时无法连接到助手，请检查网络或后端配置。",
      chatPlaceholder: "欢迎询问项目、研究方向、经历或岗位匹配度。",
      chatDisclaimer: "助手只会在当前浏览器会话中保留上下文。",
      happyToggle: "私密",
      happyToggleLabel: "打开私密代码入口",
      happyCodePlaceholder: "输入 happy code",
      happyCheckCode: "开启",
      happyDockPrompt: "先在这里输入私密代码，问题会在聊天气泡中继续。",
      happyDockReady: "代码正确，请到聊天气泡中继续。",
      happyModeChip: "Happy 模式",
      happyWaitingChip: "私密问题",
      happyPromptLead: "私密问题：",
      happyAnswerPlaceholder: "请在这里回答私密问题。",
      happyActive: "当前会话已开启 happy personality。",
      happyUnavailable: "暂时无法验证，请稍后再试。",
      wrongAnswerThumbDown: "wrong answer, thumb down",
    },
  };

  const CHAT_OPEN_KEY = "portfolio_chat_widget_open";
  const HAPPY_DOCK_OPEN_KEY = "portfolio_happy_dock_open";
  const CHAT_WIDTH_KEY = "portfolio_chat_widget_width";
  const CHAT_HEIGHT_KEY = "portfolio_chat_widget_height";
  const HAPPY_PENDING_CODE_KEY = "portfolio_happy_pending_code";
  const HAPPY_PENDING_QUESTION_KEY = "portfolio_happy_pending_question";
  const CHAT_MIN_WIDTH = 340;
  const CHAT_MIN_HEIGHT = 380;

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
  const chatModeChip = document.getElementById("chat-mode-chip");

  const happyToggle = document.getElementById("happy-toggle");
  const happyDock = document.getElementById("happy-dock");
  const happyCodeForm = document.getElementById("happy-code-form");
  const happyCodeInput = document.getElementById("happy-code-input");
  const happyCodeSubmit = document.getElementById("happy-code-submit");
  const happyCodeMessage = document.getElementById("happy-code-message");

  let history = loadHistory();
  let isWaiting = false;
  let happyToken = sessionStorage.getItem(STORAGE_KEYS.happyToken) || "";
  let happyModeEnabled = false;
  let happyPendingCode = sessionStorage.getItem(HAPPY_PENDING_CODE_KEY) || "";
  let happyPendingQuestion = sessionStorage.getItem(HAPPY_PENDING_QUESTION_KEY) || "";
  let happyPendingFeedback = "";
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

  function isHappyDockOpen() {
    return sessionStorage.getItem(HAPPY_DOCK_OPEN_KEY) === "true";
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

  function setHappyDockOpen(open) {
    if (!happyModeEnabled) {
      happyDock.hidden = true;
      happyToggle.hidden = true;
      return;
    }

    sessionStorage.setItem(HAPPY_DOCK_OPEN_KEY, open ? "true" : "false");
    happyDock.hidden = !open;
    happyToggle.hidden = false;
    happyToggle.setAttribute("aria-expanded", open ? "true" : "false");
    happyToggle.classList.toggle("is-active", open);

    if (open) {
      happyCodeInput.focus();
    }
  }

  function setBusy(busy) {
    isWaiting = busy;
    sendBtn.disabled = busy;
    chatInput.disabled = busy;
    chatClearBtn.disabled = busy;
    happyCodeSubmit.disabled = busy;
    happyCodeInput.disabled = busy;
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
    if (extra.temporary) {
      el.dataset.temporary = "true";
    }
    el.textContent = text;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return el;
  }

  function persistPendingChallenge() {
    if (happyPendingCode) {
      sessionStorage.setItem(HAPPY_PENDING_CODE_KEY, happyPendingCode);
    } else {
      sessionStorage.removeItem(HAPPY_PENDING_CODE_KEY);
    }

    if (happyPendingQuestion) {
      sessionStorage.setItem(HAPPY_PENDING_QUESTION_KEY, happyPendingQuestion);
    } else {
      sessionStorage.removeItem(HAPPY_PENDING_QUESTION_KEY);
    }
  }

  function clearPendingChallenge() {
    happyPendingCode = "";
    happyPendingQuestion = "";
    happyPendingFeedback = "";
    persistPendingChallenge();
  }

  function renderPendingHappyMessages() {
    if (!happyPendingQuestion || happyToken) {
      return;
    }

    appendMessage("assistant", `${t("happyPromptLead")} ${happyPendingQuestion}`, { temporary: true });
    if (happyPendingFeedback) {
      appendMessage("assistant", happyPendingFeedback, { temporary: true });
    }
  }

  function renderHistory() {
    chatWindow.innerHTML = "";
    if (!history.length) {
      appendMessage("assistant", t("greeting"));
    } else {
      history.forEach((item) => appendMessage(item.role, item.content, item));
    }
    renderPendingHappyMessages();
  }

  function updateHappyDockMessage(text) {
    happyCodeMessage.textContent = text;
  }

  function syncChatModeChip() {
    if (happyToken) {
      chatModeChip.hidden = false;
      chatModeChip.textContent = t("happyModeChip");
      return;
    }

    if (happyPendingQuestion) {
      chatModeChip.hidden = false;
      chatModeChip.textContent = t("happyWaitingChip");
      return;
    }

    chatModeChip.hidden = true;
    chatModeChip.textContent = "";
  }

  function updateChatInputPlaceholder() {
    chatInput.placeholder = happyPendingQuestion && !happyToken ? t("happyAnswerPlaceholder") : t("chatPlaceholder");
  }

  function clearSessionContext() {
    history = [];
    sessionStorage.removeItem(STORAGE_KEYS.chatHistory);
    sessionStorage.removeItem(STORAGE_KEYS.sessionId);
    sessionStorage.removeItem(STORAGE_KEYS.happyToken);
    happyToken = "";
    clearPendingChallenge();
    updateHappyDockMessage(t("happyDockPrompt"));
    renderHistory();
    syncChatModeChip();
    updateChatInputPlaceholder();
    chatInput.value = "";
    updateCharCounter();
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
    updateChatInputPlaceholder();
    chatDisclaimer.textContent = t("chatDisclaimer");

    happyToggle.textContent = t("happyToggle");
    happyToggle.setAttribute("aria-label", t("happyToggleLabel"));
    happyCodeInput.placeholder = t("happyCodePlaceholder");
    happyCodeSubmit.textContent = t("happyCheckCode");
    if (!happyPendingFeedback) {
      updateHappyDockMessage(happyPendingQuestion ? t("happyDockReady") : t("happyDockPrompt"));
    }

    syncChatModeChip();
  }

  function clampChatSize(width, height) {
    const maxWidth = Math.min(520, window.innerWidth - 28);
    const maxHeight = Math.min(760, window.innerHeight - 40);

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
      return;
    }

    applyChatSize(420, 520);
  }

  function onResizeMove(event) {
    if (!resizeState || event.pointerId !== resizeState.pointerId) {
      return;
    }

    const nextWidth = resizeState.startWidth + (resizeState.startX - event.clientX);
    const nextHeight = resizeState.startHeight + (resizeState.startY - event.clientY);
    applyChatSize(nextWidth, nextHeight);
  }

  function stopResize(event) {
    if (!resizeState || (event && event.pointerId !== resizeState.pointerId)) {
      return;
    }

    if (chatResizeHandle.hasPointerCapture(resizeState.pointerId)) {
      chatResizeHandle.releasePointerCapture(resizeState.pointerId);
    }
    document.body.classList.remove("is-resizing-chat");
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", stopResize);
    window.removeEventListener("pointercancel", stopResize);
    resizeState = null;
  }

  function startResize(event) {
    if (!isDesktopControlAvailable() || chatWidget.hidden) {
      return;
    }

    event.preventDefault();
    const rect = chatWidget.getBoundingClientRect();
    resizeState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };

    chatResizeHandle.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-chat");
    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  async function verifyHappyAnswer(answer) {
    const response = await fetch(`${BACKEND_URL}/api/happy/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: happyPendingCode,
        answer,
        session_id: getSessionId(),
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error("wrong-answer");
    }

    happyToken = data.token;
    sessionStorage.setItem(STORAGE_KEYS.happyToken, happyToken);
    clearPendingChallenge();
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

    if (happyPendingQuestion && !happyToken) {
      appendMessage("user", message, { temporary: true });
      chatInput.value = "";
      updateCharCounter();
      setBusy(true);

      try {
        await verifyHappyAnswer(message);
        appendMessage("assistant", t("happyActive"), { temporary: true });
        updateHappyDockMessage(t("happyDockPrompt"));
      } catch (error) {
        if (error.message === "wrong-answer") {
          happyPendingFeedback = t("wrongAnswerThumbDown");
          appendMessage("assistant", happyPendingFeedback, { temporary: true });
        } else {
          console.error(error);
          appendMessage("error", t("happyUnavailable"), { temporary: true });
        }
      } finally {
        syncChatModeChip();
        updateChatInputPlaceholder();
        setBusy(false);
        chatInput.focus();
      }
      return;
    }

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
        syncChatModeChip();
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
    setBusy(true);

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
        updateHappyDockMessage(t("wrongAnswerThumbDown"));
        return;
      }

      happyPendingCode = happyCodeInput.value;
      happyPendingQuestion = data.question || "";
      happyPendingFeedback = "";
      persistPendingChallenge();
      happyCodeForm.reset();
      updateHappyDockMessage(t("happyDockReady"));
      syncChatModeChip();
      updateChatInputPlaceholder();
      setHappyDockOpen(false);
      setChatWidgetOpen(true);
      renderHistory();
    } catch (error) {
      console.error(error);
      updateHappyDockMessage(t("happyUnavailable"));
    } finally {
      setBusy(false);
    }
  }

  document.addEventListener("portfolio:content-ready", (event) => {
    const detail = event.detail || {};
    happyModeEnabled = Boolean(detail.capabilities && detail.capabilities.happy_mode_enabled);

    if (!happyModeEnabled) {
      setHappyDockOpen(false);
      happyToggle.hidden = true;
      happyDock.hidden = true;
      clearPendingChallenge();
      syncChatModeChip();
    } else {
      happyToggle.hidden = false;
      setHappyDockOpen(isHappyDockOpen());
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
  chatResizeHandle.addEventListener("pointerdown", startResize);

  happyToggle.addEventListener("click", () => setHappyDockOpen(happyDock.hidden));

  chatInput.addEventListener("input", updateCharCounter);
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (!happyDock.hidden) {
      setHappyDockOpen(false);
      return;
    }
    if (!chatWidget.hidden) {
      setChatWidgetOpen(false);
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

  applyUiText();
  updateCharCounter();
  renderHistory();
  syncChatModeChip();
  updateHappyDockMessage(happyPendingQuestion ? t("happyDockReady") : t("happyDockPrompt"));
  updateChatInputPlaceholder();
  setChatWidgetOpen(isChatWidgetOpen());
})();
