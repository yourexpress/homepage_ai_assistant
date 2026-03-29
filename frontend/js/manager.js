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
      id: "editor-hero",
      kicker: "Top card",
      title: "Identity and intro",
      description: "Welcome copy shown at the top of the homepage.",
      defaultOpen: true,
      fields: [
        { key: "hero_badge", label: "Hero badge", rows: 2 },
        { key: "hero_title", label: "Hero title", rows: 3 },
        { key: "hero_summary", label: "Hero summary", rows: 3 },
      ],
    },
    {
      id: "editor-sections",
      kicker: "Homepage structure",
      title: "Section labels",
      description: "Short labels used across the homepage body.",
      defaultOpen: true,
      fields: [
        { key: "about_title", label: "About section title", rows: 2 },
        { key: "research_title", label: "Research section title", rows: 2 },
        { key: "contact_title", label: "Contact section title", rows: 2 },
      ],
    },
    {
      id: "editor-feedback",
      kicker: "Visitor response",
      title: "Feedback module",
      description: "Copy for the feedback prompt shown near the bottom of the homepage.",
      defaultOpen: false,
      fields: [
        { key: "section_comments_title", label: "Feedback section title", rows: 2 },
        { key: "section_comments_body", label: "Feedback section body", rows: 3 },
      ],
    },
  ];

  let loadedContent = null;
  const foldState = new Map();

  function currentLocale() {
    return getLocale();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function startCase(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function formatLocalizedText(value) {
    if (value === undefined || value === null) {
      return "";
    }
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => formatLocalizedText(item)).filter(Boolean).join(", ");
    }
    if (typeof value === "object" && ("en" in value || "zh" in value)) {
      return localize(value, currentLocale()) || value.en || value.zh || "";
    }
    return "";
  }

  function formatCount(count, singular, plural) {
    const suffix = count === 1 ? singular : plural || `${singular}s`;
    return `${count} ${suffix}`;
  }

  function formatYearRange(startYear, endYear) {
    const hasStart = startYear !== undefined && startYear !== null && startYear !== "";
    const hasEnd = endYear !== undefined && endYear !== null && endYear !== "";
    if (!hasStart && !hasEnd) {
      return "";
    }
    const start = hasStart ? String(startYear) : "?";
    const end = hasEnd ? String(endYear) : "Present";
    return `${start} - ${end}`;
  }

  function isFoldOpen(id, defaultOpen) {
    return foldState.has(id) ? foldState.get(id) : defaultOpen;
  }

  function bindFoldState(root) {
    root.querySelectorAll("[data-fold-id]").forEach((element) => {
      if (element.dataset.foldBound === "true") {
        return;
      }
      element.dataset.foldBound = "true";
      element.addEventListener("toggle", () => {
        foldState.set(element.dataset.foldId, element.open);
      });
    });
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
      <article class="manager-edit-card">
        <div class="manager-edit-title-row">
          <h3>${escapeHtml(label)}</h3>
          <span class="manager-field-key">${escapeHtml(path)}</span>
        </div>
        <div class="manager-row">
          <label class="manager-locale-field ${rows <= 2 ? "manager-locale-field--compact" : ""}">
            <span>English</span>
            <textarea data-path="${path}.en" rows="${rows}"></textarea>
          </label>
          <label class="manager-locale-field ${rows <= 2 ? "manager-locale-field--compact" : ""}">
            <span>Chinese</span>
            <textarea data-path="${path}.zh" rows="${rows}"></textarea>
          </label>
        </div>
      </article>
    `;
  }

  function buildFoldSection(config) {
    const open = isFoldOpen(config.id, config.defaultOpen !== false);
    const meta = config.meta ? `<span class="manager-fold-meta">${escapeHtml(config.meta)}</span>` : "";
    const kicker = config.kicker ? `<span class="manager-fold-kicker">${escapeHtml(config.kicker)}</span>` : "";
    const description = config.description
      ? `<p class="manager-fold-description">${escapeHtml(config.description)}</p>`
      : "";

    return `
      <details class="manager-fold ${config.className || ""}" data-fold-id="${escapeHtml(config.id)}"${open ? " open" : ""}>
        <summary>
          <div class="manager-fold-header">
            ${kicker}
            <span class="manager-fold-title">${escapeHtml(config.title)}</span>
            ${description}
          </div>
          <div class="manager-fold-aside">
            ${meta}
            <span class="manager-fold-icon" aria-hidden="true">⌄</span>
          </div>
        </summary>
        <div class="manager-fold-body">
          ${config.body}
        </div>
      </details>
    `;
  }

  function renderSubsection(title, meta, body) {
    return `
      <section class="manager-subsection">
        <div class="manager-subsection-head">
          <span>${escapeHtml(title)}</span>
          ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
        </div>
        ${body}
      </section>
    `;
  }

  function renderItemCard(title, meta, body) {
    return `
      <article class="manager-item-card">
        <strong>${escapeHtml(title)}</strong>
        ${meta ? `<div class="manager-item-meta">${escapeHtml(meta)}</div>` : ""}
        ${body ? `<p class="manager-item-copy">${escapeHtml(body)}</p>` : ""}
      </article>
    `;
  }

  function renderCardStack(items, emptyText) {
    if (!items.length) {
      return `<p class="manager-empty-state">${escapeHtml(emptyText)}</p>`;
    }
    return `<div class="manager-compact-stack">${items.join("")}</div>`;
  }

  function renderTagList(items, emptyText) {
    const filtered = items.filter(Boolean);
    if (!filtered.length) {
      return `<p class="manager-empty-state">${escapeHtml(emptyText)}</p>`;
    }
    return `
      <div class="manager-tag-list">
        ${filtered.map((item) => `<span class="manager-tag">${escapeHtml(item)}</span>`).join("")}
      </div>
    `;
  }

  function renderLinkList(items, emptyText) {
    if (!items.length) {
      return `<p class="manager-empty-state">${escapeHtml(emptyText)}</p>`;
    }
    return `
      <div class="manager-link-list">
        ${items
          .map(
            (item) => `
              <div class="manager-link-row">
                <span class="manager-link-label">${escapeHtml(item.label)}</span>
                <span class="manager-link-value">${escapeHtml(item.value)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderEditor(content) {
    managerFields.innerHTML = fieldGroups
      .map((group) =>
        buildFoldSection({
          id: group.id,
          kicker: group.kicker,
          title: group.title,
          description: group.description,
          meta: formatCount(group.fields.length, "field"),
          defaultOpen: group.defaultOpen,
          body: `<div class="manager-editor-list">${group.fields
            .map((field) => buildLocalizedRow(field.key, field.label, field.rows))
            .join("")}</div>`,
        }),
      )
      .join("");

    managerFields.querySelectorAll("[data-path]").forEach((field) => {
      field.value = resolvePath(content, field.dataset.path) || "";
    });

    bindFoldState(managerFields);
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

  function renderKnowledgeSummary(portfolio) {
    const profile = portfolio.profile || {};
    const experience = Array.isArray(portfolio.experience?.positions) ? portfolio.experience.positions : [];
    const projects = Array.isArray(portfolio.projects?.projects) ? portfolio.projects.projects : [];
    const publications = Array.isArray(portfolio.publications?.publications)
      ? portfolio.publications.publications
      : [];
    const education = Array.isArray(profile.education) ? profile.education : [];
    const research = Array.isArray(profile.research_interests) ? profile.research_interests : [];
    const skills = Array.isArray(profile.skills) ? profile.skills : [];
    const contacts = Array.isArray(profile.public_contacts) ? profile.public_contacts : [];
    const links = profile.links && typeof profile.links === "object" ? Object.entries(profile.links) : [];

    const basicsBody = `
      <div class="manager-kv-grid">
        <div class="manager-kv">
          <span>Name</span>
          <strong>${escapeHtml(formatLocalizedText(profile.name) || "Unknown")}</strong>
        </div>
        <div class="manager-kv">
          <span>Headline</span>
          <strong>${escapeHtml(formatLocalizedText(profile.headline) || "No public headline yet")}</strong>
        </div>
        <div class="manager-kv manager-kv-wide">
          <span>Location</span>
          <strong>${escapeHtml(formatLocalizedText(profile.location_public) || "Not provided")}</strong>
        </div>
      </div>
    `;

    const educationCards = education.map((entry) =>
      renderItemCard(
        `${formatLocalizedText(entry.degree) || "Degree"} at ${formatLocalizedText(entry.institution) || "Institution"}`,
        entry.year ? String(entry.year) : "",
        "",
      ),
    );

    const experienceCards = experience.map((entry) =>
      renderItemCard(
        `${formatLocalizedText(entry.title) || "Role"} at ${formatLocalizedText(entry.organization) || "Organization"}`,
        formatYearRange(entry.start_year, entry.end_year),
        formatLocalizedText(entry.focus) || formatLocalizedText(entry.description),
      ),
    );

    const projectCards = projects.map((entry) =>
      renderItemCard(
        formatLocalizedText(entry.name) || "Project",
        [entry.status, Array.isArray(entry.technologies) ? formatCount(entry.technologies.length, "technology", "technologies") : ""]
          .filter(Boolean)
          .join(" · "),
        formatLocalizedText(entry.description),
      ),
    );

    const publicationCards = publications.map((entry) =>
      renderItemCard(
        formatLocalizedText(entry.title) || "Publication",
        [entry.venue ? formatLocalizedText(entry.venue) : "", entry.year ? String(entry.year) : ""].filter(Boolean).join(" · "),
        entry.url || "",
      ),
    );

    managerKnowledgeSummary.innerHTML = [
      buildFoldSection({
        id: "knowledge-basics",
        kicker: "Profile",
        title: "Basics",
        description: "Public identity details loaded from the knowledge base.",
        meta: "Core profile",
        defaultOpen: true,
        className: "manager-profile-group",
        body: basicsBody,
      }),
      buildFoldSection({
        id: "knowledge-academic",
        kicker: "Academic",
        title: "Education and research",
        description: "Background, research interests, and public skill areas.",
        meta: formatCount(education.length + research.length + skills.length, "item"),
        defaultOpen: true,
        className: "manager-profile-group",
        body: `
          ${renderSubsection("Education", formatCount(education.length, "entry", "entries"), renderCardStack(educationCards, "No education entries in the knowledge base."))}
          ${renderSubsection(
            "Research interests",
            formatCount(research.length, "topic"),
            renderTagList(research.map((entry) => formatLocalizedText(entry)), "No research interests in the knowledge base."),
          )}
          ${renderSubsection(
            "Skills",
            formatCount(skills.length, "skill"),
            renderTagList(skills.map((entry) => formatLocalizedText(entry)), "No public skills in the knowledge base."),
          )}
        `,
      }),
      buildFoldSection({
        id: "knowledge-experience",
        kicker: "Experience",
        title: "Professional experience",
        description: "Current and previous positions grouped as a compact timeline.",
        meta: formatCount(experience.length, "position"),
        defaultOpen: true,
        className: "manager-profile-group",
        body: renderCardStack(experienceCards, "No experience entries in the knowledge base."),
      }),
      buildFoldSection({
        id: "knowledge-showcase",
        kicker: "Showcase",
        title: "Projects and publications",
        description: "Public work samples and published output.",
        meta: formatCount(projects.length + publications.length, "item"),
        defaultOpen: false,
        className: "manager-profile-group",
        body: `
          ${renderSubsection("Projects", formatCount(projects.length, "project"), renderCardStack(projectCards, "No projects in the knowledge base."))}
          ${renderSubsection(
            "Publications",
            formatCount(publications.length, "publication"),
            renderCardStack(publicationCards, "No publications in the knowledge base."),
          )}
        `,
      }),
      buildFoldSection({
        id: "knowledge-contacts",
        kicker: "Visibility",
        title: "Public contacts and links",
        description: "Channels the public profile can safely expose.",
        meta: formatCount(contacts.length + links.length, "channel"),
        defaultOpen: false,
        className: "manager-profile-group",
        body: `
          ${renderSubsection(
            "Public contacts",
            formatCount(contacts.length, "entry", "entries"),
            renderLinkList(
              contacts.map((entry) => ({
                label: formatLocalizedText(entry.label) || startCase(entry.type || "Contact"),
                value: entry.value || "",
              })),
              "No public contact entries in the knowledge base.",
            ),
          )}
          ${renderSubsection(
            "Links",
            formatCount(links.length, "link"),
            renderLinkList(
              links.map(([key, value]) => ({
                label: startCase(key),
                value,
              })),
              "No public links in the knowledge base.",
            ),
          )}
        `,
      }),
    ].join("");

    bindFoldState(managerKnowledgeSummary);
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
