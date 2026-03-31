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

  const profileAboutFields = document.getElementById("profile-about-fields");
  const profileEducationFields = document.getElementById("profile-education-fields");
  const profileResearchFields = document.getElementById("profile-research-fields");
  const profileContactFields = document.getElementById("profile-contact-fields");

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

    renderProfileOverrides(content);
  }

  function renderProfileOverrides(content) {
    renderAboutOverrides(content);
    renderEducationOverrides(content);
    renderResearchOverrides(content);
    renderContactOverrides(content);
  }

  function renderAboutOverrides(content) {
    const name = content.profile_name || { en: "", zh: "" };
    const headline = content.profile_headline || { en: "", zh: "" };
    const paragraphs = Array.isArray(content.profile_about_paragraphs)
      ? content.profile_about_paragraphs
      : [];

    profileAboutFields.innerHTML = "";

    const nameGroup = document.createElement("div");
    nameGroup.innerHTML = buildLocalizedRow("profile_name", "Name", 1);
    profileAboutFields.appendChild(nameGroup.firstElementChild);

    const headlineGroup = document.createElement("div");
    headlineGroup.innerHTML = buildLocalizedRow("profile_headline", "Headline", 2);
    profileAboutFields.appendChild(headlineGroup.firstElementChild);

    paragraphs.forEach((item, index) => {
      appendAboutParagraphItem(index, item);
    });

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "manager-add-btn";
    addBtn.textContent = "+ Add paragraph";
    addBtn.addEventListener("click", () => {
      const index = profileAboutFields.querySelectorAll(".manager-array-item").length;
      appendAboutParagraphItem(index, { en: "", zh: "" });
    });
    profileAboutFields.appendChild(addBtn);

    profileAboutFields.querySelectorAll("[data-path]").forEach((field) => {
      field.value = resolvePath(content, field.dataset.path) || "";
    });
  }

  function appendAboutParagraphItem(index, item) {
    const wrapper = document.createElement("div");
    wrapper.className = "manager-array-item";
    wrapper.innerHTML = `
      <div class="manager-array-item-head">
        <span>Paragraph ${index + 1}</span>
        <button type="button" class="manager-remove-btn" title="Remove">×</button>
      </div>
      <div class="manager-row">
        <label>English<textarea data-array="profile_about_paragraphs" data-index="${index}" data-lang="en" rows="3">${escapeAttr(item.en || "")}</textarea></label>
        <label>Chinese<textarea data-array="profile_about_paragraphs" data-index="${index}" data-lang="zh" rows="3">${escapeAttr(item.zh || "")}</textarea></label>
      </div>
    `;
    wrapper.querySelector(".manager-remove-btn").addEventListener("click", () => {
      wrapper.remove();
      reindexArrayItems(profileAboutFields, "profile_about_paragraphs");
    });
    const addBtn = profileAboutFields.querySelector(".manager-add-btn");
    if (addBtn) {
      profileAboutFields.insertBefore(wrapper, addBtn);
    } else {
      profileAboutFields.appendChild(wrapper);
    }
  }

  function renderEducationOverrides(content) {
    const items = Array.isArray(content.profile_education) ? content.profile_education : [];
    profileEducationFields.innerHTML = "";
    items.forEach((item, index) => {
      appendEducationItem(index, item);
    });
  }

  function appendEducationItem(index, item) {
    const wrapper = document.createElement("div");
    wrapper.className = "manager-array-item";
    const degree = item.degree || { en: "", zh: "" };
    const institution = item.institution || { en: "", zh: "" };
    const year = item.year || "";
    wrapper.innerHTML = `
      <div class="manager-array-item-head">
        <span>Education ${index + 1}</span>
        <button type="button" class="manager-remove-btn" title="Remove">×</button>
      </div>
      <div class="manager-row">
        <label>Degree (EN)<textarea data-array="profile_education" data-index="${index}" data-field="degree" data-lang="en" rows="1">${escapeAttr(degree.en || "")}</textarea></label>
        <label>Degree (ZH)<textarea data-array="profile_education" data-index="${index}" data-field="degree" data-lang="zh" rows="1">${escapeAttr(degree.zh || "")}</textarea></label>
      </div>
      <div class="manager-row">
        <label>Institution (EN)<textarea data-array="profile_education" data-index="${index}" data-field="institution" data-lang="en" rows="1">${escapeAttr(institution.en || "")}</textarea></label>
        <label>Institution (ZH)<textarea data-array="profile_education" data-index="${index}" data-field="institution" data-lang="zh" rows="1">${escapeAttr(institution.zh || "")}</textarea></label>
      </div>
      <div class="manager-row">
        <label>Year<input type="number" data-array="profile_education" data-index="${index}" data-field="year" value="${escapeAttr(String(year))}" /></label>
        <label></label>
      </div>
    `;
    wrapper.querySelector(".manager-remove-btn").addEventListener("click", () => {
      wrapper.remove();
      reindexArrayItems(profileEducationFields, "profile_education");
    });
    profileEducationFields.appendChild(wrapper);
  }

  function renderResearchOverrides(content) {
    const items = Array.isArray(content.profile_research_interests) ? content.profile_research_interests : [];
    profileResearchFields.innerHTML = "";
    items.forEach((item, index) => {
      appendResearchItem(index, item);
    });
  }

  function appendResearchItem(index, item) {
    const wrapper = document.createElement("div");
    wrapper.className = "manager-array-item";
    wrapper.innerHTML = `
      <div class="manager-array-item-head">
        <span>Interest ${index + 1}</span>
        <button type="button" class="manager-remove-btn" title="Remove">×</button>
      </div>
      <div class="manager-row">
        <label>English<textarea data-array="profile_research_interests" data-index="${index}" data-lang="en" rows="2">${escapeAttr(item.en || "")}</textarea></label>
        <label>Chinese<textarea data-array="profile_research_interests" data-index="${index}" data-lang="zh" rows="2">${escapeAttr(item.zh || "")}</textarea></label>
      </div>
    `;
    wrapper.querySelector(".manager-remove-btn").addEventListener("click", () => {
      wrapper.remove();
      reindexArrayItems(profileResearchFields, "profile_research_interests");
    });
    profileResearchFields.appendChild(wrapper);
  }

  function renderContactOverrides(content) {
    const items = Array.isArray(content.profile_contact_items) ? content.profile_contact_items : [];
    profileContactFields.innerHTML = "";
    items.forEach((item, index) => {
      appendContactItem(index, item);
    });
  }

  function appendContactItem(index, item) {
    const wrapper = document.createElement("div");
    wrapper.className = "manager-array-item";
    const label = item.label || { en: "", zh: "" };
    const value = item.value || { en: "", zh: "" };
    const href = item.href || "";
    wrapper.innerHTML = `
      <div class="manager-array-item-head">
        <span>Contact ${index + 1}</span>
        <button type="button" class="manager-remove-btn" title="Remove">×</button>
      </div>
      <div class="manager-row">
        <label>Label (EN)<textarea data-array="profile_contact_items" data-index="${index}" data-field="label" data-lang="en" rows="1">${escapeAttr(label.en || "")}</textarea></label>
        <label>Label (ZH)<textarea data-array="profile_contact_items" data-index="${index}" data-field="label" data-lang="zh" rows="1">${escapeAttr(label.zh || "")}</textarea></label>
      </div>
      <div class="manager-row">
        <label>Value (EN)<textarea data-array="profile_contact_items" data-index="${index}" data-field="value" data-lang="en" rows="1">${escapeAttr(value.en || "")}</textarea></label>
        <label>Value (ZH)<textarea data-array="profile_contact_items" data-index="${index}" data-field="value" data-lang="zh" rows="1">${escapeAttr(value.zh || "")}</textarea></label>
      </div>
      <div class="manager-row">
        <label>Link (href)<input type="text" data-array="profile_contact_items" data-index="${index}" data-field="href" value="${escapeAttr(href)}" placeholder="https:// or mailto:" /></label>
        <label></label>
      </div>
    `;
    wrapper.querySelector(".manager-remove-btn").addEventListener("click", () => {
      wrapper.remove();
      reindexArrayItems(profileContactFields, "profile_contact_items");
    });
    profileContactFields.appendChild(wrapper);
  }

  function reindexArrayItems(container, arrayName) {
    container.querySelectorAll(".manager-array-item").forEach((item, newIndex) => {
      item.querySelectorAll(`[data-array="${arrayName}"]`).forEach((field) => {
        field.dataset.index = String(newIndex);
      });
      const span = item.querySelector(".manager-array-item-head span");
      if (span) {
        const label = span.textContent.replace(/\d+$/, String(newIndex + 1));
        span.textContent = label;
      }
    });
  }

  function escapeAttr(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function collectArrayField(arrayName) {
    const items = [];
    const elements = managerForm.querySelectorAll(`[data-array="${arrayName}"]`);
    elements.forEach((el) => {
      const index = parseInt(el.dataset.index, 10);
      if (!items[index]) {
        items[index] = {};
      }
      const field = el.dataset.field;
      const lang = el.dataset.lang;
      if (field && lang) {
        if (!items[index][field]) {
          items[index][field] = {};
        }
        items[index][field][lang] = el.value;
      } else if (field) {
        const val = el.value.trim();
        items[index][field] = val ? (isNaN(Number(val)) ? val : Number(val)) : "";
      } else if (lang) {
        items[index][lang] = el.value;
      }
    });
    return items.filter(Boolean);
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
    profileAboutFields.querySelectorAll("[data-path]").forEach((field) => {
      assignPath(content, field.dataset.path, field.value);
    });
    content.profile_about_paragraphs = collectArrayField("profile_about_paragraphs");
    content.profile_education = collectArrayField("profile_education");
    content.profile_research_interests = collectArrayField("profile_research_interests");
    content.profile_contact_items = collectArrayField("profile_contact_items");
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

  function handleAddButtons() {
    document.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.add;
        if (type === "education") {
          const index = profileEducationFields.querySelectorAll(".manager-array-item").length;
          appendEducationItem(index, {});
        } else if (type === "research") {
          const index = profileResearchFields.querySelectorAll(".manager-array-item").length;
          appendResearchItem(index, { en: "", zh: "" });
        } else if (type === "contact") {
          const index = profileContactFields.querySelectorAll(".manager-array-item").length;
          appendContactItem(index, {});
        }
      });
    });
  }

  adminKeyInput.value = "";
  managerLoadBtn.addEventListener("click", loadDashboard);
  adminKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadDashboard();
    }
  });
  managerForm.addEventListener("submit", saveContent);
  handleAddButtons();
})();
