"use strict";

(function () {
  function configuredBackendUrl() {
    const metaValue = document
      .querySelector('meta[name="portfolio-backend-url"]')
      ?.getAttribute("content")
      ?.trim();
    if (metaValue) {
      return metaValue.replace(/\/$/, "");
    }

    const runtimeValue = window.PORTFOLIO_CONFIG && typeof window.PORTFOLIO_CONFIG.BACKEND_URL === "string"
      ? window.PORTFOLIO_CONFIG.BACKEND_URL.trim()
      : "";
    return runtimeValue ? runtimeValue.replace(/\/$/, "") : "";
  }

  function localeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get("lang") || params.get("locale") || "").toLowerCase();
    if (value.startsWith("zh")) {
      return "zh";
    }
    if (value.startsWith("en")) {
      return "en";
    }
    return "";
  }

  function defaultBackendUrl() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === "http:" ? "http:" : "https:";

    if (["localhost", "127.0.0.1"].includes(hostname)) {
      return "http://localhost:8000";
    }
    if (hostname === "runyuma.uk" || hostname === "www.runyuma.uk") {
      return "";
    }
    if (hostname.startsWith("www.")) {
      return `${protocol}//api.${hostname.slice(4)}`;
    }
    return `${protocol}//api.${hostname}`;
  }

  const BACKEND_URL = configuredBackendUrl() || defaultBackendUrl();
  const MAX_INPUT_LENGTH = 1000;
  const MAX_HISTORY_MESSAGES = 12;
  const COMMENT_PAGE_SIZE = 5;

  const STORAGE_KEYS = {
    locale: "portfolio_locale",
    sessionId: "portfolio_session_id",
    chatHistory: "portfolio_chat_history",
    happyToken: "portfolio_happy_token",
    bubbleWidth: "portfolio_bubble_width",
  };

  function detectInitialLocale() {
    const fromUrl = localeFromUrl();
    if (fromUrl) {
      return fromUrl;
    }
    const saved = localStorage.getItem(STORAGE_KEYS.locale);
    if (saved === "en" || saved === "zh") {
      return saved;
    }
    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function getLocale() {
    return document.documentElement.lang === "zh" ? "zh" : detectInitialLocale();
  }

  function setLocale(locale) {
    const next = locale === "zh" ? "zh" : "en";
    document.documentElement.lang = next;
    localStorage.setItem(STORAGE_KEYS.locale, next);
  }

  function localize(value, locale) {
    if (!value) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    return value[locale] || value.en || value.zh || "";
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem(STORAGE_KEYS.sessionId);
    if (!sessionId) {
      sessionId = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(STORAGE_KEYS.sessionId, sessionId);
    }
    return sessionId;
  }

  function isDesktopControlAvailable() {
    return window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
  }

  window.PortfolioApp = {
    BACKEND_URL,
    MAX_INPUT_LENGTH,
    MAX_HISTORY_MESSAGES,
    COMMENT_PAGE_SIZE,
    STORAGE_KEYS,
    localeFromUrl,
    detectInitialLocale,
    getLocale,
    setLocale,
    localize,
    getSessionId,
    isDesktopControlAvailable,
  };

  setLocale(detectInitialLocale());
})();
