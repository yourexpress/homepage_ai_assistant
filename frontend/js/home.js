"use strict";

(function () {
  const { BACKEND_URL, getLocale, setLocale, localize } = window.PortfolioApp;

  const UI_TEXT = {
    en: {
      navHome: "Home",
      navExperience: "Experience",
      navPublications: "Publications",
      navMetrics: "Metrics",
      heroLinkExperience: "Experience and projects",
      heroLinkPublications: "Publications",
      educationTitle: "Education background",
      commentsKicker: "Feedback",
      commentsTitle: "Share feedback",
      commentsBody: "Leave a short note about the site or profile presentation.",
      commentAuthorPlaceholder: "Your name (optional)",
      websiteRatingLabel: "Website rating",
      resumeRatingLabel: "Resume rating",
      optionalRating: "Optional",
      commentBodyPlaceholder:
        "Share what feels strong, what feels unclear, or what would help you understand the profile better.",
      postComment: "Send feedback",
      commentPosted: "Feedback sent.",
      unableToPost: "Unable to send feedback right now.",
      noEducation: "Education details will appear here when available.",
    },
    zh: {
      navHome: "主页",
      navExperience: "经历",
      navPublications: "论文",
      navMetrics: "指标",
      heroLinkExperience: "经历与项目",
      heroLinkPublications: "论文发表",
      educationTitle: "教育背景",
      commentsKicker: "反馈",
      commentsTitle: "留下反馈",
      commentsBody: "欢迎对网站或个人资料展示方式留下简短反馈。",
      commentAuthorPlaceholder: "你的名字（可选）",
      websiteRatingLabel: "网站评分",
      resumeRatingLabel: "简历评分",
      optionalRating: "可选",
      commentBodyPlaceholder: "欢迎分享你觉得清晰或需要改进的地方。",
      postComment: "发送反馈",
      commentPosted: "反馈已发送。",
      unableToPost: "暂时无法发送反馈。",
      noEducation: "教育背景信息将在可用时显示。",
    },
  };

  const FALLBACK_CONTENT = {
    hero_badge: {
      en: "Academic profile",
      zh: "学术主页",
    },
    hero_title: {
      en: "Runyu Ma connects AI systems research with real deployment.",
      zh: "Runyu Ma 致力于把 AI 系统研究与真实部署连接起来。",
    },
    hero_summary: {
      en: "Explore research interests, education background, public work, projects, publications, and contact details.",
      zh: "了解研究方向、教育背景、公开经历、项目、论文与联系方式。",
    },
    about_title: {
      en: "Brief introduction",
      zh: "简介",
    },
    about_paragraphs: [],
    research_title: {
      en: "Research interests",
      zh: "研究方向",
    },
    research_items: [],
    contact_title: {
      en: "Contact",
      zh: "联系方式",
    },
    contact_items: [],
  };

  const heroBadge = document.getElementById("hero-badge");
  const heroTitle = document.getElementById("hero-title");
  const heroSummary = document.getElementById("hero-summary");
  const aboutTitle = document.getElementById("about-title");
  const aboutParagraphs = document.getElementById("about-paragraphs");
  const researchTitle = document.getElementById("research-title");
  const researchList = document.getElementById("research-list");
  const educationTitle = document.getElementById("education-title");
  const educationList = document.getElementById("education-list");
  const contactTitle = document.getElementById("contact-title");
  const contactList = document.getElementById("contact-list");
  const feedbackCard = document.querySelector(".feedback-card");
  const commentsKicker = document.getElementById("comments-kicker");
  const sectionCommentsTitle = document.getElementById("section-comments-title");
  const sectionCommentsBody = document.getElementById("section-comments-body");
  const commentAuthor = document.getElementById("comment-author");
  const websiteRatingLabel = document.getElementById("comment-website-label");
  const resumeRatingLabel = document.getElementById("comment-resume-label");
  const optionalWebsiteOption = document.getElementById("comment-rating-optional-website");
  const optionalResumeOption = document.getElementById("comment-rating-optional-resume");
  const commentBody = document.getElementById("comment-body");
  const commentSubmitBtn = document.getElementById("comment-submit-btn");
  const commentForm = document.getElementById("comment-form");
  const commentFormMessage = document.getElementById("comment-form-message");
  const localeButtons = Array.from(document.querySelectorAll(".lang-btn"));
  const navHome = document.getElementById("nav-home");
  const navExperience = document.getElementById("nav-experience");
  const navPublications = document.getElementById("nav-publications");
  const navMetrics = document.getElementById("nav-metrics");
  const heroLinkExperience = document.getElementById("hero-link-experience");
  const heroLinkPublications = document.getElementById("hero-link-publications");

  let siteContent = FALLBACK_CONTENT;
  let portfolioData = {
    profile: {},
    experience: {},
    projects: {},
    publications: {},
  };
  let capabilities = {
    happy_mode_enabled: false,
    comments_enabled: true,
  };

  function currentLocale() {
    return getLocale();
  }

  function t(key) {
    return UI_TEXT[currentLocale()][key] || UI_TEXT.en[key] || "";
  }

  function setText(node, value) {
    if (node) {
      node.textContent = value || "";
    }
  }

  function clearChildren(node) {
    if (!node) {
      return;
    }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function setLangButtons() {
    const locale = currentLocale();
    localeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.locale === locale);
    });
  }

  function renderParagraphs(target, items) {
    clearChildren(target);
    for (const item of items || []) {
      const paragraph = document.createElement("p");
      paragraph.textContent = localize(item, currentLocale());
      target.appendChild(paragraph);
    }
  }

  function renderTextList(target, items) {
    clearChildren(target);
    for (const item of items || []) {
      const li = document.createElement("li");
      li.textContent = localize(item, currentLocale());
      target.appendChild(li);
    }
  }

  function localizedProfileName(profile) {
    return localize(profile.name, currentLocale()).trim();
  }

  function localizedHeadline(profile) {
    return localize(profile.headline, currentLocale()).trim();
  }

  function formatNaturalList(items) {
    const cleanItems = items.filter(Boolean);
    if (cleanItems.length <= 1) {
      return cleanItems[0] || "";
    }
    if (currentLocale() === "zh") {
      return cleanItems.join("、");
    }
    if (cleanItems.length === 2) {
      return `${cleanItems[0]} and ${cleanItems[1]}`;
    }
    return `${cleanItems.slice(0, -1).join(", ")}, and ${cleanItems[cleanItems.length - 1]}`;
  }

  function buildAboutParagraphItems(profile) {
    const items = [];
    const name = localizedProfileName(profile);
    const headline = localizedHeadline(profile);
    const educationItems = Array.isArray(profile.education) ? profile.education : [];
    const institutions = educationItems
      .map((item) => localize(item.institution, currentLocale()).trim())
      .filter(Boolean);

    if (name && headline) {
      if (currentLocale() === "zh") {
        items.push(`${name} 是一名${headline}。`);
      } else {
        const article = /^[aeiou]/i.test(headline) ? "an" : "a";
        items.push(`${name} is ${article} ${headline}.`);
      }
    }

    if (name && institutions.length) {
      const institutionSummary = formatNaturalList(institutions);
      if (currentLocale() === "zh") {
        items.push(`${name} 曾就读于 ${institutionSummary}。`);
      } else {
        items.push(`${name} studied at ${institutionSummary}.`);
      }
    }

    return items;
  }

  function buildHeroTitle(profile) {
    const fallback = localize(siteContent.hero_title, currentLocale());
    return localizedProfileName(profile) || fallback;
  }

  function buildHeroSummary(profile) {
    const fallback = localize(siteContent.hero_summary, currentLocale());
    return localizedHeadline(profile) || fallback;
  }

  function renderEducation(target, items) {
    clearChildren(target);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "helper-text";
      empty.textContent = t("noEducation");
      target.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "entry-card";

      const title = document.createElement("h3");
      title.textContent = localize(item.degree, currentLocale());

      const meta = document.createElement("p");
      meta.className = "entry-meta";
      meta.textContent = [localize(item.institution, currentLocale()), item.year]
        .filter(Boolean)
        .join(" - ");

      card.appendChild(title);
      card.appendChild(meta);
      target.appendChild(card);
    });
  }

  function makeContactItem(label, value, href) {
    return {
      label,
      value,
      href,
    };
  }

  function normalizeProfileContacts(profile) {
    const contacts = Array.isArray(profile.public_contacts) ? profile.public_contacts : [];
    const links = profile.links && typeof profile.links === "object" ? profile.links : {};
    const selected = {
      email: null,
      linkedin: null,
      github: null,
    };

    contacts.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }
      const type = String(item.type || "").toLowerCase();
      const value = typeof item.value === "string" ? item.value : "";
      if (!value) {
        return;
      }
      if (type === "email" && !selected.email) {
        selected.email = makeContactItem(item.label || { en: "Email", zh: "邮箱" }, value, `mailto:${value}`);
      }
      if (type === "linkedin" && !selected.linkedin) {
        selected.linkedin = makeContactItem(item.label || { en: "LinkedIn", zh: "LinkedIn" }, value, value);
      }
      if (type === "github" && !selected.github) {
        selected.github = makeContactItem(item.label || { en: "GitHub", zh: "GitHub" }, value, value);
      }
    });

    Object.entries(links).forEach(([key, href]) => {
      if (typeof href !== "string" || !href) {
        return;
      }
      const normalizedKey = key.toLowerCase();
      if (!selected.linkedin && normalizedKey.includes("linkedin")) {
        selected.linkedin = makeContactItem({ en: "LinkedIn", zh: "LinkedIn" }, href, href);
      }
      if (!selected.github && normalizedKey.includes("github")) {
        selected.github = makeContactItem({ en: "GitHub", zh: "GitHub" }, href, href);
      }
    });

    return selected;
  }

  function classifyFallbackContact(item) {
    const href = String(item.href || "");
    const label = localize(item.label, "en").toLowerCase();
    if (href.startsWith("mailto:")) {
      return "email";
    }
    if (href.includes("linkedin.com") || label.includes("linkedin")) {
      return "linkedin";
    }
    if (href.includes("github.com") || label.includes("github")) {
      return "github";
    }
    return "";
  }

  function buildContactItems() {
    const profile = portfolioData.profile || {};
    const selected = normalizeProfileContacts(profile);
    const fallbackItems = Array.isArray(siteContent.contact_items) ? siteContent.contact_items : [];

    fallbackItems.forEach((item) => {
      const kind = classifyFallbackContact(item);
      if (kind && !selected[kind]) {
        selected[kind] = {
          label: item.label,
          value: item.value,
          href: item.href,
        };
      }
    });

    return [selected.email, selected.linkedin, selected.github].filter(Boolean);
  }

  function isExternalLink(href) {
    return /^(https?:|mailto:)/i.test(href || "");
  }

  function renderResourceList(target, items) {
    clearChildren(target);
    for (const item of items || []) {
      const href = item.href || "";
      const card = href ? document.createElement("a") : document.createElement("div");
      card.className = "resource-card";
      if (href) {
        card.href = href;
      }
      if (isExternalLink(href)) {
        card.target = "_blank";
        card.rel = "noopener";
      }

      const label = document.createElement("h3");
      label.textContent = localize(item.label, currentLocale());

      const value = document.createElement("p");
      value.textContent = localize(item.value || item.description, currentLocale());

      card.appendChild(label);
      card.appendChild(value);
      target.appendChild(card);
    }
  }

  function renderStaticUi() {
    setText(navHome, t("navHome"));
    setText(navExperience, t("navExperience"));
    setText(navPublications, t("navPublications"));
    setText(navMetrics, t("navMetrics"));
    setText(heroLinkExperience, t("heroLinkExperience"));
    setText(heroLinkPublications, t("heroLinkPublications"));
    setText(educationTitle, t("educationTitle"));
    setText(commentsKicker, t("commentsKicker"));
    setText(sectionCommentsTitle, t("commentsTitle"));
    setText(sectionCommentsBody, t("commentsBody"));
    setText(websiteRatingLabel, t("websiteRatingLabel"));
    setText(resumeRatingLabel, t("resumeRatingLabel"));
    setText(optionalWebsiteOption, t("optionalRating"));
    setText(optionalResumeOption, t("optionalRating"));
    setText(commentSubmitBtn, t("postComment"));

    commentAuthor.placeholder = t("commentAuthorPlaceholder");
    commentBody.placeholder = t("commentBodyPlaceholder");
  }

  function renderContent() {
    const profile = portfolioData.profile || {};
    const researchItems =
      Array.isArray(profile.research_interests) && profile.research_interests.length
        ? profile.research_interests
        : siteContent.research_items || [];
    const educationItems = Array.isArray(profile.education) ? profile.education : [];
    const aboutItems = buildAboutParagraphItems(profile);

    setText(heroBadge, localize(siteContent.hero_badge, currentLocale()));
    setText(heroTitle, buildHeroTitle(profile));
    setText(heroSummary, buildHeroSummary(profile));
    setText(aboutTitle, localize(siteContent.about_title, currentLocale()));
    setText(researchTitle, localize(siteContent.research_title, currentLocale()));
    setText(contactTitle, localize(siteContent.contact_title, currentLocale()));

    renderParagraphs(aboutParagraphs, aboutItems.length ? aboutItems : siteContent.about_paragraphs || []);
    renderTextList(researchList, researchItems);
    renderEducation(educationList, educationItems);
    renderResourceList(contactList, buildContactItems());
    renderStaticUi();
    setLangButtons();

    if (feedbackCard) {
      feedbackCard.hidden = capabilities.comments_enabled === false;
    }

    document.dispatchEvent(
      new CustomEvent("portfolio:content-ready", {
        detail: {
          content: siteContent,
          capabilities,
          locale: currentLocale(),
        },
      }),
    );
  }

  async function loadContent() {
    const response = await fetch(`${BACKEND_URL}/api/content`);
    if (!response.ok) {
      throw new Error(`Failed to fetch site content (${response.status})`);
    }
    return response.json();
  }

  async function loadPortfolio() {
    const response = await fetch(`${BACKEND_URL}/api/portfolio`);
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio data (${response.status})`);
    }
    return response.json();
  }

  async function loadPageData() {
    const [contentResult, portfolioResult] = await Promise.allSettled([loadContent(), loadPortfolio()]);

    if (contentResult.status === "fulfilled") {
      siteContent = contentResult.value.content || FALLBACK_CONTENT;
      capabilities = contentResult.value.capabilities || capabilities;
    } else {
      console.error(contentResult.reason);
      siteContent = FALLBACK_CONTENT;
    }

    if (portfolioResult.status === "fulfilled") {
      portfolioData = portfolioResult.value;
    } else {
      console.error(portfolioResult.reason);
    }

    renderContent();
  }

  function parseOptionalRating(selectId) {
    const value = document.getElementById(selectId).value;
    return value === "" ? null : Number(value);
  }

  async function submitComment(event) {
    event.preventDefault();
    commentFormMessage.textContent = "";

    const payload = {
      author: commentAuthor.value,
      website_rating: parseOptionalRating("website-rating"),
      resume_rating: parseOptionalRating("resume-rating"),
      body: commentBody.value,
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        commentFormMessage.textContent = t("unableToPost");
        return;
      }
      commentForm.reset();
      commentFormMessage.textContent = t("commentPosted");
    } catch (error) {
      console.error(error);
      commentFormMessage.textContent = t("unableToPost");
    }
  }

  localeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLocale(button.dataset.locale);
      renderContent();
      document.dispatchEvent(new CustomEvent("portfolio:locale-changed"));
    });
  });

  commentForm.addEventListener("submit", submitComment);

  loadPageData().catch((error) => {
    console.error(error);
    renderContent();
  });
})();
