"use strict";

(function () {
  const { BACKEND_URL } = window.PortfolioApp;

  const ADMIN_KEY_STORAGE = "portfolio_admin_key";

  const adminKeyInput = document.getElementById("comments-admin-key-input");
  const loadBtn = document.getElementById("comments-load-btn");
  const status = document.getElementById("comments-admin-status");
  const panel = document.getElementById("comments-reader-panel");
  const sortSelect = document.getElementById("comments-reader-sort");
  const summary = document.getElementById("comments-reader-summary");
  const list = document.getElementById("comments-reader-list");
  const prevBtn = document.getElementById("comments-reader-prev");
  const nextBtn = document.getElementById("comments-reader-next");
  const pageLabel = document.getElementById("comments-reader-page-label");

  let currentPage = 1;
  let currentData = null;

  function authHeaders() {
    return {
      "X-Admin-Key": adminKeyInput.value,
    };
  }

  function saveAdminKey() {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKeyInput.value);
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("en-US");
  }

  function averageOf(items, key) {
    const values = items.map((item) => item[key]).filter((value) => value !== null && value !== undefined);
    if (!values.length) {
      return "N/A";
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return (total / values.length).toFixed(1);
  }

  function renderSummary(data) {
    const items = Array.isArray(data.items) ? data.items : [];
    summary.innerHTML = `
      <div class="manager-summary-card">
        <h3>Total comments</h3>
        <p>${data.total_items}</p>
      </div>
      <div class="manager-summary-card">
        <h3>Average website rating on this page</h3>
        <p>${averageOf(items, "website_rating")}</p>
      </div>
      <div class="manager-summary-card">
        <h3>Average resume rating on this page</h3>
        <p>${averageOf(items, "resume_rating")}</p>
      </div>
    `;
  }

  function buildCommentCard(comment) {
    const ratings = [
      comment.website_rating !== null && comment.website_rating !== undefined
        ? `Website ${comment.website_rating}/5`
        : "",
      comment.resume_rating !== null && comment.resume_rating !== undefined
        ? `Resume ${comment.resume_rating}/5`
        : "",
    ].filter(Boolean);

    const card = document.createElement("article");
    card.className = "comment-card";

    const meta = document.createElement("div");
    meta.className = "comment-meta";

    const identity = document.createElement("div");

    const author = document.createElement("div");
    author.className = "comment-author";
    author.textContent = comment.author;

    const time = document.createElement("div");
    time.className = "comment-time";
    time.textContent = formatDate(comment.created_at);

    identity.appendChild(author);
    identity.appendChild(time);

    const score = document.createElement("div");
    score.className = "comment-score";
    score.textContent = `Score: ${comment.score}`;

    meta.appendChild(identity);
    meta.appendChild(score);
    card.appendChild(meta);

    if (ratings.length) {
      const ratingsRow = document.createElement("div");
      ratingsRow.className = "comment-ratings";
      const ratingsText = document.createElement("span");
      ratingsText.textContent = ratings.join(" • ");
      ratingsRow.appendChild(ratingsText);
      card.appendChild(ratingsRow);
    }

    const body = document.createElement("p");
    body.textContent = comment.body;
    card.appendChild(body);

    const votes = document.createElement("div");
    votes.className = "comment-votes";

    const upvotes = document.createElement("span");
    upvotes.className = "vote-btn";
    upvotes.textContent = `Upvotes ${comment.upvotes}`;

    const downvotes = document.createElement("span");
    downvotes.className = "vote-btn";
    downvotes.textContent = `Downvotes ${comment.downvotes}`;

    votes.appendChild(upvotes);
    votes.appendChild(downvotes);
    card.appendChild(votes);

    return card;
  }

  function renderComments(data) {
    currentData = data;
    renderSummary(data);
    list.replaceChildren();
    if (data.items.length) {
      data.items.forEach((comment) => {
        list.appendChild(buildCommentCard(comment));
      });
    } else {
      const empty = document.createElement("p");
      empty.className = "helper-text";
      empty.textContent = "No comments yet.";
      list.appendChild(empty);
    }
    pageLabel.textContent = `Page ${data.page} of ${data.total_pages}`;
    prevBtn.disabled = data.page <= 1;
    nextBtn.disabled = data.page >= data.total_pages;
  }

  async function loadComments() {
    saveAdminKey();
    status.textContent = "Loading comments...";
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/admin/comments?sort=${sortSelect.value}&page=${currentPage}`,
        { headers: authHeaders() },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to load comments.");
      }
      panel.hidden = false;
      renderComments(data);
      status.textContent = "Comments loaded.";
    } catch (error) {
      console.error(error);
      status.textContent = error.message || "Unable to load comments.";
    }
  }

  adminKeyInput.value = sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";

  loadBtn.addEventListener("click", () => {
    currentPage = 1;
    loadComments();
  });

  sortSelect.addEventListener("change", () => {
    currentPage = 1;
    if (panel.hidden) {
      return;
    }
    loadComments();
  });

  prevBtn.addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    loadComments();
  });

  nextBtn.addEventListener("click", () => {
    if (!currentData || currentPage >= currentData.total_pages) {
      return;
    }
    currentPage += 1;
    loadComments();
  });
})();
