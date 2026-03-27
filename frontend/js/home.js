"use strict";

(function () {
  const {
    BACKEND_URL,
    getLocale,
    setLocale,
    localize,
  } = window.PortfolioApp;

  const heroBadge = document.getElementById("hero-badge");
  const heroTitle = document.getElementById("hero-title");
  const heroSummary = document.getElementById("hero-summary");
  const heroPanelTitle = document.getElementById("hero-panel-title");
  const heroPanelBody = document.getElementById("hero-panel-body");
  const sectionChatTitle = document.getElementById("section-chat-title");
  const sectionChatBody = document.getElementById("section-chat-body");
  const sectionCommentsTitle = document.getElementById("section-comments-title");
  const sectionCommentsBody = document.getElementById("section-comments-body");
  const aboutTitle = document.getElementById("about-title");
  const aboutParagraphs = document.getElementById("about-paragraphs");
  const researchTitle = document.getElementById("research-title");
  const researchList = document.getElementById("research-list");
  const newsTitle = document.getElementById("news-title");
  const newsList = document.getElementById("news-list");
  const toolsTitle = document.getElementById("tools-title");
  const toolsList = document.getElementById("tools-list");
  const contactTitle = document.getElementById("contact-title");
  const contactList = document.getElementById("contact-list");
  const spotlightGrid = document.getElementById("spotlight-grid");
  const commentsList = document.getElementById("comments-list");
  const commentSortSelect = document.getElementById("comment-sort-select");
  const commentsPrevBtn = document.getElementById("comments-prev-btn");
  const commentsNextBtn = document.getElementById("comments-next-btn");
  const commentsPageLabel = document.getElementById("comments-page-label");
  const commentForm = document.getElementById("comment-form");
  const commentFormMessage = document.getElementById("comment-form-message");
  const localeButtons = Array.from(document.querySelectorAll(".lang-btn"));

  let siteContent = null;
  let capabilities = {
    happy_mode_enabled: false,
    comments_enabled: true,
  };
  let commentPage = 1;

  function currentLocale() {
    return getLocale();
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

  function renderSpotlights(items) {
    clearChildren(spotlightGrid);
    for (const item of items || []) {
      const card = document.createElement("article");
      card.className = "spotlight-card";

      const title = document.createElement("h3");
      title.textContent = localize(item.title, currentLocale());

      const body = document.createElement("p");
      body.textContent = localize(item.body, currentLocale());

      card.appendChild(title);
      card.appendChild(body);
      spotlightGrid.appendChild(card);
    }
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

  function isExternalLink(href) {
    return /^(https?:|mailto:)/i.test(href || "");
  }

  function renderResourceList(target, items, detailKey) {
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

      const title = document.createElement("h3");
      title.textContent = localize(item.label, currentLocale());

      const detail = document.createElement("p");
      detail.textContent = localize(item[detailKey], currentLocale());

      card.appendChild(title);
      card.appendChild(detail);
      target.appendChild(card);
    }
  }

  function renderContent() {
    if (!siteContent) {
      return;
    }

    setText(heroBadge, localize(siteContent.hero_badge, currentLocale()));
    setText(heroTitle, localize(siteContent.hero_title, currentLocale()));
    setText(heroSummary, localize(siteContent.hero_summary, currentLocale()));
    setText(heroPanelTitle, localize(siteContent.hero_panel_title, currentLocale()));
    setText(heroPanelBody, localize(siteContent.hero_panel_body, currentLocale()));
    setText(sectionChatTitle, localize(siteContent.section_chat_title, currentLocale()));
    setText(sectionChatBody, localize(siteContent.section_chat_body, currentLocale()));
    setText(sectionCommentsTitle, localize(siteContent.section_comments_title, currentLocale()));
    setText(sectionCommentsBody, localize(siteContent.section_comments_body, currentLocale()));
    setText(aboutTitle, localize(siteContent.about_title, currentLocale()));
    setText(researchTitle, localize(siteContent.research_title, currentLocale()));
    setText(newsTitle, localize(siteContent.news_title, currentLocale()));
    setText(toolsTitle, localize(siteContent.tools_title, currentLocale()));
    setText(contactTitle, localize(siteContent.contact_title, currentLocale()));

    renderParagraphs(aboutParagraphs, siteContent.about_paragraphs || []);
    renderTextList(researchList, siteContent.research_items || []);
    renderTextList(newsList, siteContent.news_items || []);
    renderResourceList(toolsList, siteContent.tools_items || [], "description");
    renderResourceList(contactList, siteContent.contact_items || [], "value");
    renderSpotlights(siteContent.spotlights || []);
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

  function ratingStars(value) {
    return `${value}/5`;
  }

  function formatDate(value) {
    const date = new Date(value);
    return date.toLocaleString();
  }

  function renderComment(comment) {
    const article = document.createElement("article");
    article.className = "comment-card";
    article.innerHTML = `
      <div class="comment-meta">
        <div>
          <div class="comment-author">${comment.author}</div>
          <div class="comment-time">${formatDate(comment.created_at)}</div>
        </div>
        <div class="comment-score">Score: ${comment.score}</div>
      </div>
      <div class="comment-ratings">
        <span>Website ${ratingStars(comment.website_rating)}</span>
        <span>Resume ${ratingStars(comment.resume_rating)}</span>
      </div>
      <p>${comment.body}</p>
      <div class="comment-votes">
        <button type="button" class="vote-btn" data-id="${comment.id}" data-direction="up">Thumbs up (${comment.upvotes})</button>
        <button type="button" class="vote-btn" data-id="${comment.id}" data-direction="down">Thumbs down (${comment.downvotes})</button>
      </div>
    `;
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
    commentsList.innerHTML = `<p class="helper-text">Loading comments...</p>`;
    try {
      const data = await fetchComments();
      commentsList.innerHTML = "";
      if (!data.items.length) {
        commentsList.innerHTML = `<p class="helper-text">No comments yet. Be the first to leave one.</p>`;
      } else {
        data.items.forEach((comment) => commentsList.appendChild(renderComment(comment)));
      }
      commentsPageLabel.textContent = `Page ${data.page} of ${data.total_pages}`;
      commentsPrevBtn.disabled = data.page <= 1;
      commentsNextBtn.disabled = data.page >= data.total_pages;
    } catch (error) {
      commentsList.innerHTML = `<p class="helper-text">Comments are unavailable right now.</p>`;
      console.error(error);
    }
  }

  async function loadContent() {
    const response = await fetch(`${BACKEND_URL}/api/content`);
    if (!response.ok) {
      throw new Error(`Failed to fetch site content (${response.status})`);
    }
    const data = await response.json();
    siteContent = data.content;
    capabilities = data.capabilities || capabilities;
    renderContent();
    renderComments();
  }

  async function submitComment(event) {
    event.preventDefault();
    commentFormMessage.textContent = "";

    const payload = {
      author: document.getElementById("comment-author").value,
      website_rating: Number(document.getElementById("website-rating").value),
      resume_rating: Number(document.getElementById("resume-rating").value),
      body: document.getElementById("comment-body").value,
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        commentFormMessage.textContent = "Unable to post comment right now.";
        return;
      }
      commentForm.reset();
      commentFormMessage.textContent = "Comment posted.";
      commentPage = 1;
      renderComments();
    } catch (error) {
      console.error(error);
      commentFormMessage.textContent = "Unable to post comment right now.";
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
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (!target.matches(".vote-btn")) {
      return;
    }
    voteOnComment(target.dataset.id, target.dataset.direction);
  });

  commentForm.addEventListener("submit", submitComment);

  loadContent().catch((error) => {
    console.error(error);
    renderComments();
  });
})();
