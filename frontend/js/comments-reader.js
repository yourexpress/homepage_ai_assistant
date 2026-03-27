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
        <h3>Average website rating</h3>
        <p>${averageOf(items, "website_rating")}</p>
      </div>
      <div class="manager-summary-card">
        <h3>Average resume rating</h3>
        <p>${averageOf(items, "resume_rating")}</p>
      </div>
    `;
  }

  function renderComment(comment) {
    const ratings = [
      comment.website_rating !== null && comment.website_rating !== undefined
        ? `Website ${comment.website_rating}/5`
        : "",
      comment.resume_rating !== null && comment.resume_rating !== undefined
        ? `Resume ${comment.resume_rating}/5`
        : "",
    ].filter(Boolean);

    return `
      <article class="comment-card">
        <div class="comment-meta">
          <div>
            <div class="comment-author">${comment.author}</div>
            <div class="comment-time">${formatDate(comment.created_at)}</div>
          </div>
          <div class="comment-score">Score: ${comment.score}</div>
        </div>
        ${ratings.length ? `<div class="comment-ratings"><span>${ratings.join(" • ")}</span></div>` : ""}
        <p>${comment.body}</p>
        <div class="comment-votes">
          <span class="vote-btn">Upvotes ${comment.upvotes}</span>
          <span class="vote-btn">Downvotes ${comment.downvotes}</span>
        </div>
      </article>
    `;
  }

  function renderComments(data) {
    currentData = data;
    renderSummary(data);
    list.innerHTML = data.items.length
      ? data.items.map(renderComment).join("")
      : '<p class="helper-text">No comments yet.</p>';
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
