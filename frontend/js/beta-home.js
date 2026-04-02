"use strict";

/**
 * Beta Homepage – Personal Information Zone
 *
 * Loads profile data from the backend (knowledge base + admin overrides)
 * and renders the personal information section with a wide grid layout.
 *
 * Inputs:  GET /api/content (site content + overrides)
 *          GET /api/portfolio (knowledge base data)
 * Outputs: Rendered profile hero, sidebar (bio + contact), education,
 *          skills, and experience cards.
 *
 * Failure modes:
 *   - Backend unreachable → falls back to hardcoded defaults
 *   - Partial data        → renders available fields, leaves others empty
 */
(function () {
  var PortfolioApp = window.PortfolioApp;
  var BACKEND_URL = PortfolioApp.BACKEND_URL;
  var getLocale = PortfolioApp.getLocale;
  var setLocale = PortfolioApp.setLocale;
  var localize = PortfolioApp.localize;

  var UI_TEXT = {
    en: {
      badge: "Academic Profile",
      aboutTitle: "Bio Summary",
      educationTitle: "Education",
      skillsTitle: "Skills",
      contactTitle: "Contact Info",
      experienceTitle: "Experience Highlights",
      dataModelTitle: "Data / Admin Model",
      linkExperience: "View Experience",
      linkPublications: "Publications",
      linkResume: "Resume",
      noEducation: "Education details will appear when available.",
      noExperience: "Experience details will appear when available.",
      stableNav: "\u2190 Current Homepage",
      navExperience: "Experience",
      navPublications: "Publications",
    },
    zh: {
      badge: "\u5b66\u672f\u4e3b\u9875",
      aboutTitle: "\u4e2a\u4eba\u7b80\u4ecb",
      educationTitle: "\u6559\u80b2\u80cc\u666f",
      skillsTitle: "\u6280\u80fd",
      contactTitle: "\u8054\u7cfb\u65b9\u5f0f",
      experienceTitle: "\u7ecf\u5386\u4eae\u70b9",
      dataModelTitle: "\u6570\u636e / \u7ba1\u7406\u6a21\u5f0f",
      linkExperience: "\u67e5\u770b\u7ecf\u5386",
      linkPublications: "\u8bba\u6587\u53d1\u8868",
      linkResume: "\u7b80\u5386",
      noEducation: "\u6559\u80b2\u80cc\u666f\u4fe1\u606f\u5c06\u5728\u53ef\u7528\u65f6\u663e\u793a\u3002",
      noExperience: "\u7ecf\u5386\u4fe1\u606f\u5c06\u5728\u53ef\u7528\u65f6\u663e\u793a\u3002",
      stableNav: "\u2190 \u5f53\u524d\u4e3b\u9875",
      navExperience: "\u7ecf\u5386",
      navPublications: "\u8bba\u6587",
    },
  };

  var FALLBACK_CONTENT = {
    hero_badge: { en: "Academic Profile", zh: "\u5b66\u672f\u4e3b\u9875" },
    hero_title: { en: "Runyu Ma", zh: "Runyu Ma" },
    hero_summary: {
      en: "Researcher, AI Inference Engineer, Machine Learning Engineer",
      zh: "\u7814\u7a76\u5458\u3001AI \u63a8\u7406\u5de5\u7a0b\u5e08\u3001\u673a\u5668\u5b66\u4e60\u5de5\u7a0b\u5e08",
    },
    about_paragraphs: [],
    research_items: [],
    contact_items: [],
    profile_name: { en: "", zh: "" },
    profile_headline: { en: "", zh: "" },
    profile_about_paragraphs: [],
    profile_education: [],
    profile_research_interests: [],
    profile_contact_items: [],
  };

  var siteContent = FALLBACK_CONTENT;
  var portfolioData = { profile: {}, experience: {}, projects: {}, publications: {} };

  /* ---- DOM refs ---- */
  var profileName = document.getElementById("profile-name");
  var profileHeadline = document.getElementById("profile-headline");
  var aboutTitle = document.getElementById("about-title");
  var aboutParagraphs = document.getElementById("about-paragraphs");
  var educationTitle = document.getElementById("education-title");
  var educationList = document.getElementById("education-list");
  var skillsTitle = document.getElementById("skills-title");
  var skillsList = document.getElementById("skills-list");
  var contactTitle = document.getElementById("contact-title");
  var contactList = document.getElementById("contact-list");
  var experienceTitle = document.getElementById("experience-title");
  var experienceList = document.getElementById("experience-list");
  var linkExperience = document.getElementById("link-experience");
  var linkPublications = document.getElementById("link-publications");
  var headerResume = document.getElementById("header-resume");
  var navExperience = document.getElementById("nav-experience");
  var navPublications = document.getElementById("nav-publications");
  var newsTicker = document.getElementById("news-ticker");
  var newsTickerLabel = document.getElementById("news-ticker-label");
  var newsTickerContent = document.getElementById("news-ticker-content");
  var localeButtons = Array.from(document.querySelectorAll(".beta-lang-btn"));

  /* ---- Helpers ---- */
  function currentLocale() { return getLocale(); }
  function t(key) { return UI_TEXT[currentLocale()][key] || UI_TEXT.en[key] || ""; }

  function setText(node, value) {
    if (node) { node.textContent = value || ""; }
  }

  function clearChildren(node) {
    if (!node) { return; }
    while (node.firstChild) { node.removeChild(node.firstChild); }
  }

  function hasOverride(value) {
    if (Array.isArray(value)) { return value.length > 0; }
    if (value && typeof value === "object") {
      return Boolean((value.en && value.en.trim()) || (value.zh && value.zh.trim()));
    }
    return false;
  }

  function localizedProfileName(profile) {
    return localize(profile.name, currentLocale()).trim();
  }

  function localizedHeadline(profile) {
    return localize(profile.headline, currentLocale()).trim();
  }

  /* ---- Build data with override priority ---- */
  function buildName(profile) {
    if (hasOverride(siteContent.profile_name)) {
      return localize(siteContent.profile_name, currentLocale());
    }
    return localizedProfileName(profile) || localize(siteContent.hero_title, currentLocale()) || "Runyu Ma";
  }

  function buildHeadline(profile) {
    if (hasOverride(siteContent.profile_headline)) {
      return localize(siteContent.profile_headline, currentLocale());
    }
    return localizedHeadline(profile) || localize(siteContent.hero_summary, currentLocale());
  }

  function buildAboutItems(profile) {
    if (hasOverride(siteContent.profile_about_paragraphs)) {
      return siteContent.profile_about_paragraphs;
    }
    var items = siteContent.about_paragraphs || [];
    if (items.length) { return items; }

    var result = [];
    var name = localizedProfileName(profile);
    var headline = localizedHeadline(profile);
    if (name && headline) {
      if (currentLocale() === "zh") {
        result.push(name + " \u662f\u4e00\u540d" + headline + "\u3002");
      } else {
        var article = /^[aeiou]/i.test(headline) ? "an" : "a";
        result.push(name + " is " + article + " " + headline + ".");
      }
    }
    return result;
  }

  function buildEducation(profile) {
    if (hasOverride(siteContent.profile_education)) {
      return siteContent.profile_education;
    }
    return Array.isArray(profile.education) ? profile.education : [];
  }

  function buildSkills(profile) {
    if (Array.isArray(profile.skills) && profile.skills.length) {
      return profile.skills;
    }
    if (hasOverride(siteContent.profile_research_interests)) {
      return siteContent.profile_research_interests;
    }
    if (Array.isArray(profile.research_interests) && profile.research_interests.length) {
      return profile.research_interests;
    }
    return siteContent.research_items || [];
  }

  function classifyFallbackContact(item) {
    var href = String(item.href || "");
    var label = localize(item.label, "en").toLowerCase();
    if (href.startsWith("mailto:")) { return "email"; }
    if (href.includes("linkedin.com") || label.includes("linkedin")) { return "linkedin"; }
    if (href.includes("github.com") || label.includes("github")) { return "github"; }
    return "";
  }

  function buildContactItems(profile) {
    if (hasOverride(siteContent.profile_contact_items)) {
      return siteContent.profile_contact_items;
    }
    var contacts = Array.isArray(profile.public_contacts) ? profile.public_contacts : [];
    var links = profile.links && typeof profile.links === "object" ? profile.links : {};
    var selected = { email: null, linkedin: null, github: null };

    contacts.forEach(function (item) {
      if (!item || typeof item !== "object") { return; }
      var type = String(item.type || "").toLowerCase();
      var value = typeof item.value === "string" ? item.value : "";
      if (!value) { return; }
      if (type === "email" && !selected.email) {
        selected.email = { label: item.label || { en: "Email", zh: "\u90ae\u7bb1" }, value: value, href: "mailto:" + value };
      }
      if (type === "linkedin" && !selected.linkedin) {
        selected.linkedin = { label: item.label || { en: "LinkedIn", zh: "LinkedIn" }, value: value, href: value };
      }
      if (type === "github" && !selected.github) {
        selected.github = { label: item.label || { en: "GitHub", zh: "GitHub" }, value: value, href: value };
      }
    });

    Object.entries(links).forEach(function (pair) {
      var key = pair[0];
      var href = pair[1];
      if (typeof href !== "string" || !href) { return; }
      var nk = key.toLowerCase();
      if (!selected.linkedin && nk.includes("linkedin")) {
        selected.linkedin = { label: { en: "LinkedIn", zh: "LinkedIn" }, value: href, href: href };
      }
      if (!selected.github && nk.includes("github")) {
        selected.github = { label: { en: "GitHub", zh: "GitHub" }, value: href, href: href };
      }
    });

    var fallbackItems = Array.isArray(siteContent.contact_items) ? siteContent.contact_items : [];
    fallbackItems.forEach(function (item) {
      var kind = classifyFallbackContact(item);
      if (kind && !selected[kind]) {
        selected[kind] = { label: item.label, value: item.value, href: item.href };
      }
    });

    return [selected.email, selected.linkedin, selected.github].filter(Boolean);
  }

  /** Return static entries describing how the data / admin model works. */
  var DATA_MODEL_ENTRIES = {
    en: [
      {
        heading: "Source of truth",
        description: "Knowledge-base summary feeds the public profile by default.",
      },
      {
        heading: "Safe override",
        description: "Manager edits selectively replace fields through authenticated, validated, server-side update flow.",
      },
    ],
    zh: [
      {
        heading: "\u6570\u636e\u6765\u6e90",
        description: "\u77e5\u8bc6\u5e93\u6458\u8981\u9ed8\u8ba4\u586b\u5145\u516c\u5f00\u4e3b\u9875\u3002",
      },
      {
        heading: "\u5b89\u5168\u8986\u76d6",
        description: "\u7ba1\u7406\u5458\u901a\u8fc7\u8eab\u4efd\u9a8c\u8bc1\u3001\u670d\u52a1\u5668\u7aef\u6821\u9a8c\u7684\u66f4\u65b0\u6d41\u7a0b\u9009\u62e9\u6027\u66ff\u6362\u5b57\u6bb5\u3002",
      },
    ],
  };

  /** Return up to 4 experience entries for the highlights section. */
  function buildExperienceItems() {
    var exp = portfolioData.experience || {};
    var entries = exp.entries || exp.items || [];
    if (!Array.isArray(entries)) { return []; }
    return entries.slice(0, 4);
  }

  /* ---- Render ---- */
  function renderContent() {
    var profile = portfolioData.profile || {};

    setText(profileName, buildName(profile));
    setText(profileHeadline, buildHeadline(profile));
    setText(aboutTitle, t("aboutTitle"));
    setText(educationTitle, t("educationTitle"));
    setText(skillsTitle, t("skillsTitle"));
    setText(contactTitle, t("contactTitle"));
    setText(experienceTitle, t("experienceTitle"));
    setText(navExperience, t("navExperience"));
    setText(navPublications, t("navPublications"));

    if (linkExperience) {
      linkExperience.textContent = t("linkExperience");
    }
    if (linkPublications) {
      linkPublications.textContent = t("linkPublications");
    }

    renderAbout(aboutParagraphs, buildAboutItems(profile));
    renderEducation(educationList, buildEducation(profile));
    renderSkills(skillsList, buildSkills(profile));
    renderContacts(contactList, buildContactItems(profile));
    renderExperience(experienceList, buildExperienceItems());
    renderNewsTicker();
    setLangButtons();
  }

  function renderAbout(target, items) {
    clearChildren(target);
    (items || []).forEach(function (item) {
      var p = document.createElement("p");
      p.textContent = typeof item === "string" ? item : localize(item, currentLocale());
      target.appendChild(p);
    });
  }

  function renderEducation(target, items) {
    clearChildren(target);
    if (!items || !items.length) {
      var empty = document.createElement("p");
      empty.className = "edu-empty";
      empty.textContent = t("noEducation");
      target.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var entry = document.createElement("div");
      entry.className = "edu-entry";

      var info = document.createElement("div");
      info.className = "edu-info";

      var h3 = document.createElement("h3");
      h3.textContent = localize(item.institution, currentLocale());

      var degree = document.createElement("p");
      degree.textContent = localize(item.degree, currentLocale());

      info.appendChild(h3);
      info.appendChild(degree);

      if (item.description) {
        var desc = document.createElement("p");
        desc.className = "edu-description";
        desc.textContent = localize(item.description, currentLocale());
        info.appendChild(desc);
      }

      entry.appendChild(info);
      target.appendChild(entry);
    });
  }

  function renderSkills(target, items) {
    clearChildren(target);
    (items || []).forEach(function (item) {
      var tag = document.createElement("span");
      tag.className = "skill-tag";
      tag.textContent = typeof item === "string" ? item : localize(item, currentLocale());
      target.appendChild(tag);
    });
  }

  function renderContacts(target, items) {
    clearChildren(target);
    (items || []).forEach(function (item) {
      var row = document.createElement("div");
      row.className = "contact-item";

      var label = document.createElement("span");
      label.className = "contact-label";
      label.textContent = localize(item.label, currentLocale()) + " \u00b7";

      var valueText = localize(item.value || item.description, currentLocale());
      var href = item.href || "";

      if (href) {
        var a = document.createElement("a");
        a.className = "contact-value";
        a.textContent = valueText;
        a.href = href;
        if (/^(https?:|mailto:)/i.test(href)) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        row.appendChild(label);
        row.appendChild(a);
      } else {
        var span = document.createElement("span");
        span.className = "contact-value";
        span.textContent = valueText;
        row.appendChild(label);
        row.appendChild(span);
      }

      target.appendChild(row);
    });
  }

  function renderExperience(target, items) {
    if (!target) { return; }
    clearChildren(target);
    if (!items || !items.length) {
      var empty = document.createElement("p");
      empty.textContent = t("noExperience");
      target.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var entry = document.createElement("div");
      entry.className = "exp-entry";

      var h3 = document.createElement("h3");
      /* Priority: company > organization > title (first non-empty wins). */
      h3.textContent = localize(item.company || item.organization || item.title, currentLocale());
      entry.appendChild(h3);

      if (item.role || item.position) {
        var role = document.createElement("p");
        role.className = "exp-role";
        role.textContent = localize(item.role || item.position, currentLocale());
        entry.appendChild(role);
      }

      if (item.description || item.summary) {
        var desc = document.createElement("p");
        desc.className = "exp-desc";
        desc.textContent = localize(item.description || item.summary, currentLocale());
        entry.appendChild(desc);
      }

      target.appendChild(entry);
    });
  }

  function renderDataModel(target) {
    if (!target) { return; }
    clearChildren(target);
    var items = DATA_MODEL_ENTRIES[currentLocale()] || DATA_MODEL_ENTRIES.en;
    items.forEach(function (item) {
      var entry = document.createElement("div");
      entry.className = "exp-entry";

      var h3 = document.createElement("h3");
      h3.textContent = item.heading;
      entry.appendChild(h3);

      var desc = document.createElement("p");
      desc.className = "exp-desc";
      desc.textContent = item.description;
      entry.appendChild(desc);

      target.appendChild(entry);
    });
  }

  function renderNewsTicker() {
    if (!newsTicker || !newsTickerContent) { return; }
    var items = siteContent.news_items || [];
    if (!items.length) {
      newsTicker.hidden = true;
      return;
    }
    /* Set label */
    if (newsTickerLabel) {
      var title = siteContent.news_title || {};
      newsTickerLabel.textContent = localize(title, currentLocale()) || "News";
    }
    /* Build duplicated content for seamless infinite scroll */
    var texts = items.map(function (item) {
      return localize(item, currentLocale());
    }).filter(Boolean);
    if (!texts.length) {
      newsTicker.hidden = true;
      return;
    }
    var html = "";
    /* Duplicate the items so the second half scrolls in as the first scrolls out */
    for (var dup = 0; dup < 2; dup++) {
      texts.forEach(function (txt) {
        html += "<span>" + txt + "</span>";
      });
    }
    newsTickerContent.innerHTML = html;
    newsTicker.hidden = false;
  }

  function setLangButtons() {
    var locale = currentLocale();
    localeButtons.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.locale === locale);
    });
  }

  /* ---- Data loading ---- */
  function loadContent() {
    return fetch(BACKEND_URL + "/api/content")
      .then(function (r) {
        if (!r.ok) { throw new Error("Failed to fetch site content"); }
        return r.json();
      });
  }

  function loadPortfolio() {
    return fetch(BACKEND_URL + "/api/portfolio")
      .then(function (r) {
        if (!r.ok) { throw new Error("Failed to fetch portfolio data"); }
        return r.json();
      });
  }

  function loadPageData() {
    return Promise.allSettled([loadContent(), loadPortfolio()])
      .then(function (results) {
        if (results[0].status === "fulfilled") {
          siteContent = results[0].value.content || FALLBACK_CONTENT;
        } else {
          console.error(results[0].reason);
          siteContent = FALLBACK_CONTENT;
        }
        if (results[1].status === "fulfilled") {
          portfolioData = results[1].value;
        } else {
          console.error(results[1].reason);
        }
        renderContent();
        /* Wire the resume download link after initial render. */
        wireResumeLink();
      });
  }

  /**
   * Check whether a resume has been uploaded and set the header link href.
   * Hides the icon when no resume is available.
   */
  function wireResumeLink() {
    if (!headerResume) { return; }
    fetch(BACKEND_URL + "/api/resume/info")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.available) {
          headerResume.href = BACKEND_URL + "/api/resume/latest";
          headerResume.setAttribute("download", "");
          headerResume.hidden = false;
        } else {
          headerResume.hidden = true;
        }
      })
      .catch(function (err) {
        console.error("Failed to check resume availability:", err);
        headerResume.hidden = true;
      });
  }

  /* ---- Events ---- */
  localeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLocale(btn.dataset.locale);
      renderContent();
    });
  });

  /* ---- Init ---- */
  loadPageData().catch(function (err) {
    console.error(err);
    renderContent();
  });
})();
