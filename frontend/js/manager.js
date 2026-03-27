"use strict";

(function () {
  const { BACKEND_URL, getLocale, localize } = window.PortfolioApp;

  const ADMIN_KEY_STORAGE = "portfolio_admin_key";

  const adminKeyInput = document.getElementById("admin-key-input");
  const managerLoadBtn = document.getElementById("manager-load-btn");
  const managerStatus = document.getElementById("manager-status");
  const managerForm = document.getElementById("manager-form");
  const managerFields = document.getElementById("manager-fields");
  const managerSyncNotes = document.getElementById("manager-sync-notes");
  const managerKnowledgeSummary = document.getElementById("manager-knowledge-summary");

  const fieldGroups = [
    {
      title: "Hero copy",
      description: "Short welcome copy shown at the top of the homepage.",
      fields: [
        { key: "hero_badge", label: "Hero badge", rows: 2 },
        { key: "hero_title", label: "Hero title", rows: 3 },
        { key: "hero_summary", label: "Hero summary", rows: 3 },
      ],
    },
    {
      title: "Section labels",
      description: "Lightweight section titles used around the homepage.",
      fields: [
        { key: "about_title", label: "About section title", rows: 2 },
        { key: "research_title", label: "Research section title", rows: 2 },
        { key: "contact_title", label: "Contact section title", rows: 2 },
      ],
    },
  ];

  let loadedContent = null;

  function currentLocale() {
    return getLocale();
  }

  function saveAdminKey() {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKeyInput.value);
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKeyInput.value,
    };
  }

  function buildLocalizedRow(path, label, rows) {
    return `
      <section class="manager-group">
        <h3>${label}</h3>
        <div class="manager-row">
          <label>
            English
            <textarea data-path="${path}.en" rows="${rows}"></textarea>
          </label>
          <label>
            Chinese
            <textarea data-path="${path}.zh" rows="${rows}"></textarea>
          </label>
        </div>
      </section>
    `;
  }

  function renderEditor(content) {
    managerFields.innerHTML = "";

    fieldGroups.forEach((group) => {
      const wrapper = document.createElement("section");
      wrapper.className = "manager-section";

      const heading = document.createElement("div");
      heading.className = "manager-section-head";
      heading.innerHTML = `
        <h3>${group.title}</h3>
        <p>${group.description}</p>
      `;
      wrapper.appendChild(heading);

      group.fields.forEach((field) => {
        const section = document.createElement("div");
        section.innerHTML = buildLocalizedRow(field.key, field.label, field.rows);
        wrapper.appendChild(section.firstElementChild);
      });

      managerFields.appendChild(wrapper);
    });

    managerFields.querySelectorAll("[data-path]").forEach((field) => {
      field.value = resolvePath(content, field.dataset.path) || "";
    });
  }

  function resolvePath(root, path) {
    return path.split(".").reduce((value, segment) => {
      if (value === undefined || value === null) {
        return "";
      }
      return value[segment];
    }, root);
  }

  function assignPath(root, path, value) {
    const parts = path.split(".");
    let cursor = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = parts[index];
      cursor[key] = cursor[key] || {};
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
  }

  function cloneContent() {
    return loadedContent ? JSON.parse(JSON.stringify(loadedContent)) : {};
  }

  function collectContent() {
    const content = cloneContent();
    managerFields.querySelectorAll("[data-path]").forEach((field) => {
      assignPath(content, field.dataset.path, field.value);
    });
    return content;
  }

  function renderNotes(notes) {
    managerSyncNotes.innerHTML = "";
    if (!notes.length) {
      return;
    }
    notes.forEach((note) => {
      const item = document.createElement("div");
      item.className = "sync-note";
      item.textContent = note;
      managerSyncNotes.appendChild(item);
    });
  }

  function formatCount(count, label) {
    return `${count} ${label}`;
  }

  function makeSummaryCard(title, body) {
    return `
      <div class="manager-summary-card">
        <h3>${title}</h3>
        <p>${body}</p>
      </div>
    `;
  }

  function renderKnowledgeSummary(portfolio) {
    const profile = portfolio.profile || {};
    const name = localize(profile.name, currentLocale()) || "Unknown";
    const headline = localize(profile.headline, currentLocale()) || "No public headline available yet.";
    const education = Array.isArray(profile.education) ? profile.education.length : 0;
    const research = Array.isArray(profile.research_interests) ? profile.research_interests.length : 0;
    const contacts = Array.isArray(profile.public_contacts) ? profile.public_contacts.length : 0;
    const links = profile.links && typeof profile.links === "object" ? Object.keys(profile.links).length : 0;

    managerKnowledgeSummary.innerHTML = `
      ${makeSummaryCard("Name", name)}
      ${makeSummaryCard("Headline", headline)}
      ${makeSummaryCard("Education", formatCount(education, "entries"))}
      ${makeSummaryCard("Research interests", formatCount(research, "items"))}
      ${makeSummaryCard("Public contacts", formatCount(contacts + links, "available channels"))}
    `;
  }

  async function loadContent() {
    const response = await fetch(`${BACKEND_URL}/api/admin/site-content`, {
      headers: authHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Unable to load content.");
    }
    return data.content;
  }

  async function loadPortfolio() {
    const response = await fetch(`${BACKEND_URL}/api/portfolio`);
    if (!response.ok) {
      throw new Error("Unable to load knowledge summary.");
    }
    return response.json();
  }

  async function loadDashboard() {
    saveAdminKey();
    managerStatus.textContent = "Loading dashboard...";
    try {
      const [content, portfolio] = await Promise.all([loadContent(), loadPortfolio()]);
      loadedContent = content;
      renderEditor(loadedContent);
      renderKnowledgeSummary(portfolio);
      renderNotes([]);
      managerForm.hidden = false;
      managerStatus.textContent = "Dashboard loaded.";
    } catch (error) {
      console.error(error);
      managerStatus.textContent = error.message || "Unable to load dashboard.";
    }
  }

  async function saveContent(event) {
    event.preventDefault();
    saveAdminKey();
    managerStatus.textContent = "Saving...";
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/site-content`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ content: collectContent() }),
      });
      const data = await response.json();
      if (!response.ok) {
        managerStatus.textContent = data.detail || "Unable to save content.";
        return;
      }
      loadedContent = data.content;
      renderEditor(loadedContent);
      renderNotes(data.sync_notes || []);
      managerStatus.textContent = "Homepage presentation copy saved.";
    } catch (error) {
      console.error(error);
      managerStatus.textContent = "Unable to save content.";
    }
  }

  adminKeyInput.value = sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
  managerLoadBtn.addEventListener("click", loadDashboard);
  managerForm.addEventListener("submit", saveContent);
})();
