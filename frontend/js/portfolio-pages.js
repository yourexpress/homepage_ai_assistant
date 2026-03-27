"use strict";

(function () {
  const { BACKEND_URL, getLocale, setLocale, localize } = window.PortfolioApp;

  const UI_TEXT = {
    experience: {
      en: {
        navHome: "Home",
        navExperience: "Experience",
        navPublications: "Publications",
        navMetrics: "Metrics",
        pageKicker: "Experience",
        pageTitle: "Experience and projects",
        pageSummary: "A clearer view of public work experience, focus areas, and selected projects.",
        experienceTitle: "Work experience",
        projectsTitle: "Projects",
        noExperience: "No public experience entries are available yet.",
        noProjects: "No public project entries are available yet.",
        present: "Present",
        technologies: "Technologies",
      },
      zh: {
        navHome: "主页",
        navExperience: "经历",
        navPublications: "论文",
        navMetrics: "指标",
        pageKicker: "经历",
        pageTitle: "经历与项目",
        pageSummary: "更清晰地展示公开的工作经历、研究重点和项目内容。",
        experienceTitle: "工作经历",
        projectsTitle: "项目",
        noExperience: "暂时没有公开的经历信息。",
        noProjects: "暂时没有公开的项目信息。",
        present: "至今",
        technologies: "技术栈",
      },
    },
    publications: {
      en: {
        navHome: "Home",
        navExperience: "Experience",
        navPublications: "Publications",
        navMetrics: "Metrics",
        pageKicker: "Publications",
        pageTitle: "Publications",
        pageSummary: "Public papers and publication information available on the site.",
        publicationsTitle: "Publication list",
        noPublications: "No public publications are available yet.",
      },
      zh: {
        navHome: "主页",
        navExperience: "经历",
        navPublications: "论文",
        navMetrics: "指标",
        pageKicker: "论文",
        pageTitle: "论文发表",
        pageSummary: "这里展示站点中公开可见的论文与发表信息。",
        publicationsTitle: "论文列表",
        noPublications: "暂时没有公开的论文信息。",
      },
    },
  };

  const page = document.body.dataset.page;
  const localeButtons = Array.from(document.querySelectorAll(".lang-btn"));
  const navHome = document.getElementById("nav-home");
  const navExperience = document.getElementById("nav-experience");
  const navPublications = document.getElementById("nav-publications");
  const navMetrics = document.getElementById("nav-metrics");
  const pageKicker = document.getElementById("page-kicker");
  const pageTitle = document.getElementById("page-title");
  const pageSummary = document.getElementById("page-summary");

  let portfolioData = {
    profile: {},
    experience: {},
    projects: {},
    publications: {},
  };

  function currentLocale() {
    return getLocale();
  }

  function t(key) {
    return UI_TEXT[page][currentLocale()][key] || UI_TEXT[page].en[key] || "";
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

  function renderStaticUi() {
    setText(navHome, t("navHome"));
    setText(navExperience, t("navExperience"));
    setText(navPublications, t("navPublications"));
    setText(navMetrics, t("navMetrics"));
    setText(pageKicker, t("pageKicker"));
    setText(pageTitle, t("pageTitle"));
    setText(pageSummary, t("pageSummary"));
    setLangButtons();
  }

  function renderExperiencePage() {
    const experienceTitle = document.getElementById("experience-section-title");
    const projectsTitle = document.getElementById("projects-section-title");
    const experienceList = document.getElementById("experience-list");
    const projectsList = document.getElementById("projects-list");

    setText(experienceTitle, t("experienceTitle"));
    setText(projectsTitle, t("projectsTitle"));

    clearChildren(experienceList);
    clearChildren(projectsList);

    const positions = Array.isArray(portfolioData.experience.positions) ? portfolioData.experience.positions : [];
    if (!positions.length) {
      const empty = document.createElement("p");
      empty.className = "helper-text";
      empty.textContent = t("noExperience");
      experienceList.appendChild(empty);
    } else {
      positions.forEach((item) => {
        const card = document.createElement("article");
        card.className = "entry-card";

        const title = document.createElement("h3");
        title.textContent = `${localize(item.title, currentLocale())} • ${localize(item.organization, currentLocale())}`;

        const meta = document.createElement("p");
        meta.className = "entry-meta";
        const endYear = item.end_year || t("present");
        meta.textContent = `${item.start_year || ""} - ${endYear}`;

        const focus = document.createElement("p");
        focus.className = "entry-detail";
        focus.textContent = localize(item.focus, currentLocale());

        const description = document.createElement("p");
        description.className = "entry-detail";
        description.textContent = localize(item.description, currentLocale());

        card.appendChild(title);
        card.appendChild(meta);
        if (focus.textContent) {
          card.appendChild(focus);
        }
        if (description.textContent) {
          card.appendChild(description);
        }
        experienceList.appendChild(card);
      });
    }

    const projects = Array.isArray(portfolioData.projects.projects) ? portfolioData.projects.projects : [];
    if (!projects.length) {
      const empty = document.createElement("p");
      empty.className = "helper-text";
      empty.textContent = t("noProjects");
      projectsList.appendChild(empty);
    } else {
      projects.forEach((item) => {
        const card = document.createElement("article");
        card.className = "entry-card";

        const title = document.createElement("h3");
        title.textContent = localize(item.name, currentLocale());

        const description = document.createElement("p");
        description.className = "entry-detail";
        description.textContent = localize(item.description, currentLocale());

        const tech = document.createElement("p");
        tech.className = "entry-meta";
        const techItems = Array.isArray(item.technologies) ? item.technologies.map((value) => localize(value, currentLocale())) : [];
        tech.textContent = techItems.length ? `${t("technologies")}: ${techItems.join(", ")}` : "";

        card.appendChild(title);
        if (description.textContent) {
          card.appendChild(description);
        }
        if (tech.textContent) {
          card.appendChild(tech);
        }

        if (item.url) {
          const link = document.createElement("a");
          link.className = "entry-link";
          link.href = item.url;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = item.url;
          card.appendChild(link);
        }

        projectsList.appendChild(card);
      });
    }
  }

  function renderPublicationsPage() {
    const publicationsTitle = document.getElementById("publications-section-title");
    const publicationsList = document.getElementById("publications-list");

    setText(publicationsTitle, t("publicationsTitle"));
    clearChildren(publicationsList);

    const items = Array.isArray(portfolioData.publications.publications)
      ? portfolioData.publications.publications
      : [];

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "helper-text";
      empty.textContent = t("noPublications");
      publicationsList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "entry-card";

      const title = document.createElement("h3");
      title.textContent = localize(item.title, currentLocale());

      const meta = document.createElement("p");
      meta.className = "entry-meta";
      meta.textContent = [item.year, localize(item.venue, currentLocale())].filter(Boolean).join(" • ");

      card.appendChild(title);
      if (meta.textContent) {
        card.appendChild(meta);
      }

      if (item.url) {
        const link = document.createElement("a");
        link.className = "entry-link";
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = item.url;
        card.appendChild(link);
      }

      publicationsList.appendChild(card);
    });
  }

  async function loadPortfolio() {
    const response = await fetch(`${BACKEND_URL}/api/portfolio`);
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio data (${response.status})`);
    }
    portfolioData = await response.json();
  }

  function renderPage() {
    renderStaticUi();
    if (page === "experience") {
      renderExperiencePage();
    } else if (page === "publications") {
      renderPublicationsPage();
    }
  }

  localeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLocale(button.dataset.locale);
      renderPage();
    });
  });

  loadPortfolio()
    .then(renderPage)
    .catch((error) => {
      console.error(error);
      renderPage();
    });
})();
