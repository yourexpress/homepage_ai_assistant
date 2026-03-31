"use strict";

/**
 * Beta Homepage – Personal Information Zone
 *
 * Loads profile data from the backend (knowledge base + admin overrides)
 * and renders the personal information section.
 *
 * Inputs:  GET /api/content (site content + overrides)
 *          GET /api/portfolio (knowledge base data)
 * Outputs: Rendered profile hero, about, education, skills, contact cards.
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
      aboutTitle: "About",
      educationTitle: "Education",
      skillsTitle: "Skills & Research Interests",
      contactTitle: "Contact",
      linkExperience: "Experience & Projects",
      linkPublications: "Publications",
      linkResume: "Resume",
      chatTitle: "Ask the AI Assistant",
      chatSubtitle: "Ask about my research, experience, projects, or anything on this site.",
      noEducation: "Education details will appear when available.",
      stableNav: "\u2190 Current Homepage",
      navExperience: "Experience",
      navPublications: "Publications",
    },
    zh: {
      badge: "\u5b66\u672f\u4e3b\u9875",
      aboutTitle: "\u7b80\u4ecb",
      educationTitle: "\u6559\u80b2\u80cc\u666f",
      skillsTitle: "\u6280\u80fd\u4e0e\u7814\u7a76\u65b9\u5411",
      contactTitle: "\u8054\u7cfb\u65b9\u5f0f",
      linkExperience: "\u7ecf\u5386\u4e0e\u9879\u76ee",
      linkPublications: "\u8bba\u6587\u53d1\u8868",
      linkResume: "\u7b80\u5386",
      chatTitle: "\u548c AI \u52a9\u624b\u4ea4\u6d41",
      chatSubtitle: "\u6b22\u8fce\u8be2\u95ee\u7814\u7a76\u65b9\u5411\u3001\u7ecf\u5386\u3001\u9879\u76ee\u6216\u8005\u672c\u7ad9\u4efb\u4f55\u5185\u5bb9\u3002",
      noEducation: "\u6559\u80b2\u80cc\u666f\u4fe1\u606f\u5c06\u5728\u53ef\u7528\u65f6\u663e\u793a\u3002",
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
  var profileBadge = document.getElementById("profile-badge");
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
  var linkExperience = document.getElementById("link-experience");
  var linkPublications = document.getElementById("link-publications");
  var chatZoneTitle = document.getElementById("chat-zone-title");
  var chatZoneSubtitle = document.getElementById("chat-zone-subtitle");
  var navStable = document.getElementById("nav-stable");
  var navExperience = document.getElementById("nav-experience");
  var navPublications = document.getElementById("nav-publications");
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

  /* ---- Render ---- */
  function renderContent() {
    var profile = portfolioData.profile || {};

    setText(profileBadge, t("badge"));
    setText(profileName, buildName(profile));
    setText(profileHeadline, buildHeadline(profile));
    setText(aboutTitle, t("aboutTitle"));
    setText(educationTitle, t("educationTitle"));
    setText(skillsTitle, t("skillsTitle"));
    setText(contactTitle, t("contactTitle"));
    setText(chatZoneTitle, t("chatTitle"));
    setText(chatZoneSubtitle, t("chatSubtitle"));
    setText(navStable, t("stableNav"));
    setText(navExperience, t("navExperience"));
    setText(navPublications, t("navPublications"));

    if (linkExperience) {
      var expSpan = linkExperience.querySelector("span");
      var expText = linkExperience.lastChild;
      if (expText && expText.nodeType === 3) { expText.textContent = " " + t("linkExperience"); }
    }
    if (linkPublications) {
      var pubText = linkPublications.lastChild;
      if (pubText && pubText.nodeType === 3) { pubText.textContent = " " + t("linkPublications"); }
    }

    renderAbout(aboutParagraphs, buildAboutItems(profile));
    renderEducation(educationList, buildEducation(profile));
    renderSkills(skillsList, buildSkills(profile));
    renderContacts(contactList, buildContactItems(profile));
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
      h3.textContent = localize(item.degree, currentLocale());

      var inst = document.createElement("p");
      inst.textContent = localize(item.institution, currentLocale());

      info.appendChild(h3);
      info.appendChild(inst);

      var year = document.createElement("span");
      year.className = "edu-year";
      year.textContent = item.year || "";

      entry.appendChild(info);
      entry.appendChild(year);
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
      label.textContent = localize(item.label, currentLocale());

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
      });
  }

  /* ---- Events ---- */
  localeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLocale(btn.dataset.locale);
      renderContent();
    });
  });

  /* ---- Chat collapse toggle ---- */
  var chatZone = document.getElementById("chat-zone");
  var collapseBtn = document.getElementById("chat-collapse-btn");

  if (collapseBtn && chatZone) {
    collapseBtn.addEventListener("click", function () {
      chatZone.classList.toggle("is-collapsed");
      var expanded = !chatZone.classList.contains("is-collapsed");
      collapseBtn.setAttribute("aria-expanded", String(expanded));
    });
  }

  /* ---- Init ---- */
  loadPageData().catch(function (err) {
    console.error(err);
    renderContent();
  });
})();
