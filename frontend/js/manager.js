"use strict";

(function () {
  const { BACKEND_URL } = window.PortfolioApp;
  const adminKeyInput = document.getElementById("admin-key-input");
  const managerLoadBtn = document.getElementById("manager-load-btn");
  const managerStatus = document.getElementById("manager-status");
  const managerForm = document.getElementById("manager-form");
  const managerFields = document.getElementById("manager-fields");
  const managerSyncNotes = document.getElementById("manager-sync-notes");

  const fieldSchema = [
    { key: "hero_badge", label: "Hero badge" },
    { key: "hero_title", label: "Hero title" },
    { key: "hero_summary", label: "Hero summary" },
    { key: "hero_panel_title", label: "Hero panel title" },
    { key: "hero_panel_body", label: "Hero panel body" },
    { key: "section_chat_title", label: "Chat section title" },
    { key: "section_chat_body", label: "Chat section body" },
    { key: "section_comments_title", label: "Comments section title" },
    { key: "section_comments_body", label: "Comments section body" },
    { key: "about_title", label: "About section title" },
    { key: "research_title", label: "Research section title" },
    { key: "news_title", label: "News section title" },
    { key: "tools_title", label: "Tools section title" },
    { key: "contact_title", label: "Contact section title" },
  ];

  const localizedListSchema = [
    { key: "about_paragraphs", label: "About paragraph", fallbackCount: 2, rows: 4 },
    { key: "research_items", label: "Research item", fallbackCount: 4, rows: 2 },
    { key: "news_items", label: "News item", fallbackCount: 1, rows: 3 },
  ];

  const resourceListSchema = [
    {
      key: "tools_items",
      label: "Tool",
      detailKey: "description",
      detailLabel: "Description",
      fallbackCount: 2,
      rows: 2,
    },
    {
      key: "contact_items",
      label: "Contact item",
      detailKey: "value",
      detailLabel: "Value",
      fallbackCount: 3,
      rows: 2,
    },
  ];

  let loadedContent = null;

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

  function buildResourceRow(schema, index) {
    const basePath = `${schema.key}.${index}`;
    return `
      <section class="manager-group">
        <h3>${schema.label} ${index + 1}</h3>
        <div class="manager-row">
          <label>
            Label (EN)
            <textarea data-path="${basePath}.label.en" rows="2"></textarea>
          </label>
          <label>
            Label (ZH)
            <textarea data-path="${basePath}.label.zh" rows="2"></textarea>
          </label>
          <label>
            ${schema.detailLabel} (EN)
            <textarea data-path="${basePath}.${schema.detailKey}.en" rows="${schema.rows}"></textarea>
          </label>
          <label>
            ${schema.detailLabel} (ZH)
            <textarea data-path="${basePath}.${schema.detailKey}.zh" rows="${schema.rows}"></textarea>
          </label>
          <label>
            Link URL
            <input data-path="${basePath}.href" type="text" />
          </label>
        </div>
      </section>
    `;
  }

  function collectionItems(content, key, fallbackCount) {
    if (Array.isArray(content?.[key]) && content[key].length) {
      return content[key];
    }
    return Array.from({ length: fallbackCount }, () => ({}));
  }

  function renderEditor(content) {
    managerFields.innerHTML = "";

    fieldSchema.forEach((field) => {
      managerFields.insertAdjacentHTML("beforeend", buildLocalizedRow(field.key, field.label, 3));
    });

    localizedListSchema.forEach((schema) => {
      collectionItems(content, schema.key, schema.fallbackCount).forEach((_, index) => {
        managerFields.insertAdjacentHTML(
          "beforeend",
          buildLocalizedRow(`${schema.key}.${index}`, `${schema.label} ${index + 1}`, schema.rows)
        );
      });
    });

    collectionItems(content, "spotlights", 3).forEach((_, index) => {
      managerFields.insertAdjacentHTML(
        "beforeend",
        `
          <section class="manager-group">
            <h3>Spotlight ${index + 1}</h3>
            <div class="manager-row">
              <label>
                Title (EN)
                <textarea data-path="spotlights.${index}.title.en" rows="2"></textarea>
              </label>
              <label>
                Title (ZH)
                <textarea data-path="spotlights.${index}.title.zh" rows="2"></textarea>
              </label>
              <label>
                Body (EN)
                <textarea data-path="spotlights.${index}.body.en" rows="3"></textarea>
              </label>
              <label>
                Body (ZH)
                <textarea data-path="spotlights.${index}.body.zh" rows="3"></textarea>
              </label>
            </div>
          </section>
        `
      );
    });

    resourceListSchema.forEach((schema) => {
      collectionItems(content, schema.key, schema.fallbackCount).forEach((_, index) => {
        managerFields.insertAdjacentHTML("beforeend", buildResourceRow(schema, index));
      });
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
      const nextKey = parts[index + 1];
      const needsArray = /^\d+$/.test(nextKey);
      if (cursor[key] === undefined) {
        cursor[key] = needsArray ? [] : {};
      }
      cursor = cursor[key];
      if (Array.isArray(cursor) && /^\d+$/.test(nextKey)) {
        const arrayIndex = Number(nextKey);
        cursor[arrayIndex] = cursor[arrayIndex] || {};
      }
    }
    const lastKey = parts[parts.length - 1];
    cursor[lastKey] = value;
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

  async function loadContent() {
    managerStatus.textContent = "Loading content...";
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/site-content`, {
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        managerStatus.textContent = data.detail || "Unable to load content.";
        return;
      }
      loadedContent = data.content;
      renderEditor(loadedContent);
      managerForm.hidden = false;
      managerStatus.textContent = "Content loaded.";
      renderNotes([]);
    } catch (error) {
      console.error(error);
      managerStatus.textContent = "Unable to load content.";
    }
  }

  async function saveContent(event) {
    event.preventDefault();
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
      managerStatus.textContent = "Homepage content saved.";
    } catch (error) {
      console.error(error);
      managerStatus.textContent = "Unable to save content.";
    }
  }

  managerLoadBtn.addEventListener("click", loadContent);
  managerForm.addEventListener("submit", saveContent);
})();
