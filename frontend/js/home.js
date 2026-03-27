"use strict";

(function () {
  const {
    BACKEND_URL,
    getLocale,
    setLocale,
    localize,
  } = window.PortfolioApp;

  const UI_TEXT = {
    en: {
      navHome: "Home",
      navExperience: "Experience",
      navPublications: "Publications",
      navMetrics: "Metrics",
      heroLinkExperience: "Experience and projects",
      heroLinkPublications: "Publications",
      educationTitle: "Education background",
      commentsKicker: "Comments",
      commentsTitle: "Visitor comments",
      commentsBody: "Leave feedback on the website and the presentation of the profile.",
      sortLatest: "Latest",
      sortLikest: "Most liked",
      commentAuthorPlaceholder: "Your name (optional)",
      websiteRatingLabel: "Website rating",
      resumeRatingLabel: "Resume rating",
      optionalRating: "Optional",
      commentBodyPlaceholder: "Share what feels strong, what feels unclear, or what would help you understand the profile better.",
      postComment: "Post comment",
      loadingComments: "Loading comments...",
      noComments: "No comments yet. Be the first to leave one.",
      commentsUnavailable: "Comments are unavailable right now.",
      pageLabel: "Page {page} of {total}",
      previous: "Previous",
      next: "Next",
      score: "Score",
      websiteShort: "Website",
      resumeShort: "Resume",
      thumbsUp: "Thumbs up",
      thumbsDown: "Thumbs down",
      commentPosted: "Comment posted.",
      unableToPost: "Unable to post comment right now.",
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
      commentsKicker: "留言",
      commentsTitle: "访客留言",
      commentsBody: "欢迎对网站和个人资料展示方式留下反馈。",
      sortLatest: "最新",
      sortLikest: "最受欢迎",
      commentAuthorPlaceholder: "你的名字（可选）",
      websiteRatingLabel: "网站评分",
      resumeRatingLabel: "简历评分",
      optionalRating: "可选",
      commentBodyPlaceholder: "欢迎分享你觉得清晰或需要改进的地方。",
      postComment: "提交留言",
      loadingComments: "正在加载留言……",
      noComments: "还没有留言，欢迎成为第一位留言者。",
      commentsUnavailable: "当前无法加载留言。",
      pageLabel: "第 {page} / {total} 页",
      previous: "上一页",
      next: "下一页",
      score: "得分",
      websiteShort: "网站",
      resumeShort: "简历",
      thumbsUp: "赞同",
      thumbsDown: "不赞同",
      commentPosted: "留言已提交。",
      unableToPost: "暂时无法提交留言。",
      noEducation: "教育背景信息将在可用时显示。",
    },
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
  const commentsKicker = document.getElementById("comments-kicker");
  const sectionCommentsTitle = document.getElementById("section-comments-title");
  const sectionCommentsBody = document.getElementById("section-comments-body");
  const commentSortSelect = document.getElementById("comment-sort-select");
  const sortLatestOption = document.getElementById("comment-sort-latest");
  const sortLikestOption = document.getElementById("comment-sort-likest");
  const commentAuthor = document.getElementById("comment-author");
  const websiteRatingLabel = document.getElementById("comment-website-label");
  const resumeRatingLabel = document.getElementById("comment-resume-label");
  const optionalWebsiteOption = document.getElementById("comment-rating-optional-website");
  const optionalResumeOption = document.getElementById("comment-rating-optional-resume");
  const commentBody = document.getElementById("comment-body");
  const commentSubmitBtn = document.getElementById("comment-submit-btn");
  const commentsList = document.getElementById("comments-list");
  const commentsPrevBtn = document.getElementById("comments-prev-btn");
  const commentsNextBtn = document.getElementById("comments-next-btn");
  const commentsPageLabel = document.getElementById("comments-page-label");
  const commentForm = document.getElementById("comment-form");
  const commentFormMessage = document.getElementById("comment-form-message");
  const localeButtons = Array.from(document.querySelectorAll(".lang-btn"));
  const navHome = document.getElementById("nav-home");
  const navExperience = document.getElementById("nav-experience");
  const navPublications = document.getElementById("nav-publications");
  const navMetrics = document.getElementById("nav-metrics");
  const heroLinkExperience = document.getElementById("hero-link-experience");
  const heroLinkPublications = document.getElementById("hero-link-publications");

  let siteContent = null;
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
  let commentPage = 1;

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

  function ratingStars(value) {
    return `${value}/5`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return date.toLocaleString(currentLocale() === "zh" ? "zh-CN" : "en-US");
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
      meta.textContent = [localize(item.institution, currentLocale()), item.year].filter(Boolean).join(" • ");

      card.appendChild(title);
      card.appendChild(meta);
      target.appendChild(card);
    });
  }

  function buildContactItems() {
    const profile = portfolioData.profile || {};
    const contacts = Array.isArray(profile.public_contacts) ? profile.public_contacts : [];
    const links = profile.links && typeof profile.links === "object" ? profile.links : {};

    const contactItems = contacts.map((item) => {
      const value = typeof item.value === "string" ? item.value : "";
      let href = "";
      if (/^https?:/i.test(value) || /^mailto:/i.test(value)) {
        href = value;
      } else if (item.type === "email" && value) {
        href = `mailto:${value}`;
      }
      return {
        label: item.label || { en: item.type || "Contact", zh: item.type || "联系方式" },
        value,
        href,
      };
    });

    Object.entries(links).forEach(([label, href]) => {
      if (typeof href !== "string" || !href) {
        return;
      }
      contactItems.push({
        label: {
          en: label.charAt(0).toUpperCase() + label.slice(1),
          zh: label.charAt(0).toUpperCase() + label.slice(1),
        },
        value: href,
        href,
      });
    });

    return contactItems.length ? contactItems : siteContent?.contact_items || [];
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
    setText(sortLatestOption, t("sortLatest"));
    setText(sortLikestOption, t("sortLikest"));
    setText(websiteRatingLabel, t("websiteRatingLabel"));
    setText(resumeRatingLabel, t("resumeRatingLabel"));
    setText(optionalWebsiteOption, t("optionalRating"));
    setText(optionalResumeOption, t("optionalRating"));
    setText(commentSubmitBtn, t("postComment"));
    setText(commentsPrevBtn, t("previous"));
    setText(commentsNextBtn, t("next"));

    commentAuthor.placeholder = t("commentAuthorPlaceholder");
    commentBody.placeholder = t("commentBodyPlaceholder");
  }

  function renderContent() {
    if (!siteContent) {
      return;
    }

    const profile = portfolioData.profile || {};
    const researchItems = Array.isArray(profile.research_interests) && profile.research_interests.length
      ? profile.research_interests
      : siteContent.research_items || [];
    const educationItems = Array.isArray(profile.education) ? profile.education : [];

    setText(heroBadge, localize(siteContent.hero_badge, currentLocale()));
    setText(heroTitle, localize(siteContent.hero_title, currentLocale()));
    setText(heroSummary, localize(siteContent.hero_summary, currentLocale()));
    setText(aboutTitle, localize(siteContent.about_title, currentLocale()));
    setText(researchTitle, localize(siteContent.research_title, currentLocale()));
    setText(contactTitle, localize(siteContent.contact_title, currentLocale()));

    renderParagraphs(aboutParagraphs, siteContent.about_paragraphs || []);
    renderTextList(researchList, researchItems);
    renderEducation(educationList, educationItems);
    renderResourceList(contactList, buildContactItems());
    renderStaticUi();
    setLangButtons();

    document.dispatchEvent(
      new CustomEvent("portfolio:content-ready", {
        detail: {
          content: siteContent,
          capabilities,
          locale: currentLocale(),
        },
      })
    );
  }

  function renderComment(comment) {
    const article = document.createElement("article");
    article.className = "comment-card";

    const meta = document.createElement("div");
    meta.className = "comment-meta";

    const leftMeta = document.createElement("div");
    const author = document.createElement("div");
    author.className = "comment-author";
    author.textContent = comment.author;
    const time = document.createElement("div");
    time.className = "comment-time";
    time.textContent = formatDate(comment.created_at);
    leftMeta.appendChild(author);
    leftMeta.appendChild(time);

    const score = document.createElement("div");
    score.className = "comment-score";
    score.textContent = `${t("score")}: ${comment.score}`;

    meta.appendChild(leftMeta);
    meta.appendChild(score);

    const ratings = document.createElement("div");
    ratings.className = "comment-ratings";
    if (comment.website_rating !== null && comment.website_rating !== undefined) {
      const website = document.createElement("span");
      website.textContent = `${t("websiteShort")} ${ratingStars(comment.website_rating)}`;
      ratings.appendChild(website);
    }
    if (comment.resume_rating !== null && comment.resume_rating !== undefined) {
      const resume = document.createElement("span");
      resume.textContent = `${t("resumeShort")} ${ratingStars(comment.resume_rating)}`;
      ratings.appendChild(resume);
    }

    const body = document.createElement("p");
    body.textContent = comment.body;

    const votes = document.createElement("div");
    votes.className = "comment-votes";
    votes.innerHTML = `
      <button type="button" class="vote-btn" data-id="${comment.id}" data-direction="up">${t("thumbsUp")} (${comment.upvotes})</button>
      <button type="button" class="vote-btn" data-id="${comment.id}" data-direction="down">${t("thumbsDown")} (${comment.downvotes})</button>
    `;

    article.appendChild(meta);
    if (ratings.childNodes.length) {
      article.appendChild(ratings);
    }
    article.appendChild(body);
    article.appendChild(votes);
    return article;
  }

  async function fetchComments() {
    const params = new URLSearchParams({
      sort: commentSortSelect.value,
      page: String(commentPage),
    });
    const response = await fetch(`${BACKEND_URL}/api/comments?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch comments (${response.status})`);
    }
    return response.json();
  }

  async function renderComments() {
    commentsList.innerHTML = `<p class="helper-text">${t("loadingComments")}</p>`;
    try {
      const data = await fetchComments();
      commentsList.innerHTML = "";
      if (!data.items.length) {
        commentsList.innerHTML = `<p class="helper-text">${t("noComments")}</p>`;
      } else {
        data.items.forEach((comment) => commentsList.appendChild(renderComment(comment)));
      }
      commentsPageLabel.textContent = t("pageLabel")
        .replace("{page}", String(data.page))
        .replace("{total}", String(data.total_pages));
      commentsPrevBtn.disabled = data.page <= 1;
      commentsNextBtn.disabled = data.page >= data.total_pages;
    } catch (error) {
      commentsList.innerHTML = `<p class="helper-text">${t("commentsUnavailable")}</p>`;
      console.error(error);
    }
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
      siteContent = contentResult.value.content;
      capabilities = contentResult.value.capabilities || capabilities;
    } else {
      throw contentResult.reason;
    }

    if (portfolioResult.status === "fulfilled") {
      portfolioData = portfolioResult.value;
    }

    renderContent();
    renderComments();
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
      commentPage = 1;
      renderComments();
    } catch (error) {
      console.error(error);
      commentFormMessage.textContent = t("unableToPost");
    }
  }

  async function voteOnComment(commentId, direction) {
    try {
      await fetch(`${BACKEND_URL}/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      renderComments();
    } catch (error) {
      console.error(error);
    }
  }

  localeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLocale(button.dataset.locale);
      renderContent();
      renderComments();
      document.dispatchEvent(new CustomEvent("portfolio:locale-changed"));
    });
  });

  commentSortSelect.addEventListener("change", () => {
    commentPage = 1;
    renderComments();
  });

  commentsPrevBtn.addEventListener("click", () => {
    commentPage = Math.max(1, commentPage - 1);
    renderComments();
  });

  commentsNextBtn.addEventListener("click", () => {
    commentPage += 1;
    renderComments();
  });

  commentsList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(".vote-btn")) {
      return;
    }
    voteOnComment(target.dataset.id, target.dataset.direction);
  });

  commentForm.addEventListener("submit", submitComment);

  loadPageData().catch((error) => {
    console.error(error);
    renderStaticUi();
    renderComments();
  });
})();
