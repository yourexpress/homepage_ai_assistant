"use strict";

(function () {
  const { BACKEND_URL } = window.PortfolioApp;
  const metricsRoot = document.getElementById("metrics-root");
  const refreshNote = document.getElementById("refresh-note");
  const POLL_INTERVAL_MS = 10_000;

  function buildCounterGrid(data) {
    const cards = [
      { label: "Total Requests", key: "total_requests" },
      { label: "LLM Calls", key: "llm_requests" },
      { label: "Successful", key: "successful_responses" },
      { label: "Blocked", key: "blocked_requests" },
      { label: "Rate Limited", key: "rate_limited_requests" },
      { label: "Server Busy", key: "concurrency_rejected_requests" },
      { label: "Prompt Tokens", key: "total_prompt_tokens" },
      { label: "Completion Tokens", key: "total_completion_tokens" },
    ];

    const grid = document.createElement("div");
    grid.className = "metrics-grid";
    cards.forEach(({ label, key }) => {
      const card = document.createElement("div");
      card.className = "metric-card";
      card.innerHTML = `
        <div class="metric-value">${(data[key] || 0).toLocaleString()}</div>
        <div class="metric-label">${label}</div>
      `;
      grid.appendChild(card);
    });
    return grid;
  }

  function buildLatencySection(buckets) {
    const total = Object.values(buckets).reduce((sum, value) => sum + value, 0) || 1;
    const rows = [
      { label: "< 1 s", key: "lt_1s" },
      { label: "1 - 3 s", key: "1s_to_3s" },
      { label: "3 - 10 s", key: "3s_to_10s" },
      { label: "> 10 s", key: "gt_10s" },
    ];

    const section = document.createElement("section");
    section.innerHTML = `<div class="metrics-section-title">Response Latency Distribution</div>`;

    rows.forEach(({ label, key }) => {
      const count = buckets[key] || 0;
      const pct = Math.round((count / total) * 100);
      const row = document.createElement("div");
      row.className = "latency-bar-row";
      row.innerHTML = `
        <span>${label}</span>
        <div class="latency-bar-bg"><div class="latency-bar-fill" style="width:${pct}%"></div></div>
        <span>${count}</span>
      `;
      section.appendChild(row);
    });

    return section;
  }

  function renderError(message) {
    metricsRoot.innerHTML = `<p class="metrics-error">${message}</p>`;
  }

  async function fetchMetrics() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/metrics`);
      if (!response.ok) {
        renderError(`Unable to fetch metrics (HTTP ${response.status}).`);
        return;
      }
      const data = await response.json();
      metricsRoot.innerHTML = "";
      metricsRoot.appendChild(buildCounterGrid(data));
      metricsRoot.appendChild(buildLatencySection(data.latency_buckets || {}));
      refreshNote.textContent = `Last updated: ${new Date().toLocaleTimeString()} - refreshes every 10 seconds`;
    } catch (error) {
      console.error(error);
      renderError("Unable to reach the backend. Metrics are unavailable.");
    }
  }

  fetchMetrics();
  setInterval(fetchMetrics, POLL_INTERVAL_MS);
})();
