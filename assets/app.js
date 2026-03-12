(() => {
  const state = {
    projects: [],
    prompts: [],
    search: "",
    activeFilters: new Set(),
  };

  const DOM = {
    toast: document.getElementById("toast"),
    menuToggle: document.querySelector(".menu-toggle"),
    navLinks: document.getElementById("primary-nav"),
  };
  let revealObserver = null;
  let mediaObserver = null;

  function initNavigation() {
    if (DOM.menuToggle && DOM.navLinks) {
      DOM.menuToggle.addEventListener("click", () => {
        const isOpen = DOM.navLinks.classList.toggle("is-open");
        DOM.menuToggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    document.addEventListener("click", (event) => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
    });
  }

  function showToast(message) {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      DOM.toast.classList.remove("is-visible");
    }, 1600);
  }

  function copyText(text) {
    if (!text) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("Copied"))
        .catch(() => fallbackCopy(text));
      return;
    }

    fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "absolute";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(input);
    showToast(copied ? "Copied" : "Copy failed");
  }

  function loadProjectsData() {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "./assets/data/projects.json", true);
      xhr.overrideMimeType("application/json");

      xhr.onload = () => {
        const okay = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
        if (!okay) {
          reject(new Error(`Unable to load projects.json (status ${xhr.status})`));
          return;
        }

        try {
          const parsed = JSON.parse(xhr.responseText);
          resolve(parsed);
        } catch (error) {
          reject(new Error("projects.json is invalid JSON"));
        }
      };

      xhr.onerror = () => reject(new Error("Unable to load projects.json"));
      xhr.send();
    });
  }

  function registerRevealElements(root = document) {
    const targets = root.querySelectorAll(
      ".hero-inner, .section-head, .card, .controls, .results-meta, .footer-inner"
    );
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    targets.forEach((target) => {
      target.classList.add("reveal");

      if (reduceMotion) {
        target.classList.add("is-visible");
        return;
      }

      if (revealObserver) {
        revealObserver.observe(target);
      } else {
        target.classList.add("is-visible");
      }
    });
  }

  function initMotion() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
      );
    }

    registerRevealElements(document);

    if (!reduceMotion) {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--scroll-y", String(window.scrollY || 0));
          ticking = false;
        });
      };

      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function initTimeline() {
    const timeline = document.querySelector("[data-timeline]");
    if (!timeline) return;

    const steps = Array.from(timeline.querySelectorAll(".timeline-step"));
    const panels = Array.from(timeline.querySelectorAll(".timeline-panel"));
    const track = timeline.querySelector(".timeline-track");
    if (steps.length === 0 || panels.length === 0) return;

    const activateStep = (nextStep, moveFocus = false) => {
      if (!nextStep) return;
      const targetId = nextStep.dataset.timelineTarget;
      if (!targetId) return;
      const activeIndex = Number.parseInt(nextStep.dataset.stepIndex || "-1", 10);

      steps.forEach((step) => {
        const active = step === nextStep;
        step.classList.toggle("is-active", active);
        step.setAttribute("aria-selected", String(active));
        step.setAttribute("tabindex", active ? "0" : "-1");
      });

      panels.forEach((panel) => {
        const show = panel.id === targetId;
        panel.classList.toggle("is-active", show);
        panel.hidden = !show;
      });

      if (!Number.isNaN(activeIndex) && activeIndex >= 0) {
        timeline.style.setProperty("--active-step", String(activeIndex));
      }

      if (track) {
        const stepRect = nextStep.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const computed = getComputedStyle(nextStep);
        const dotGapRaw = computed.getPropertyValue("--timeline-dot-gap").trim();
        const dotGap = Number.parseFloat(dotGapRaw) || 0;
        const dotLeft = stepRect.left - trackRect.left - dotGap;
        const dotTop = stepRect.top - trackRect.top + stepRect.height / 2;
        track.style.setProperty("--active-left", `${dotLeft}px`);
        track.style.setProperty("--active-top", `${dotTop}px`);
      }

      if (moveFocus) {
        nextStep.focus();
      }
    };

    steps.forEach((step, index) => {
      step.addEventListener("click", () => activateStep(step));
      step.addEventListener("keydown", (event) => {
        const key = event.key;
        if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") {
          return;
        }

        event.preventDefault();
        let targetIndex = index;

        if (key === "ArrowDown" || key === "ArrowRight") {
          targetIndex = (index + 1) % steps.length;
        } else if (key === "ArrowUp" || key === "ArrowLeft") {
          targetIndex = (index - 1 + steps.length) % steps.length;
        } else if (key === "Home") {
          targetIndex = 0;
        } else if (key === "End") {
          targetIndex = steps.length - 1;
        }

        activateStep(steps[targetIndex], true);
      });
    });

    const initial = steps.find((step) => step.classList.contains("is-active")) || steps[0];
    activateStep(initial);
  }

  function projectMatches(project) {
    const query = state.search.trim().toLowerCase();
    const haystack = [
      project.title,
      project.summary,
      ...(project.tools || []),
      ...(project.tags || []),
    ]
      .join(" ")
      .toLowerCase();

    const searchPass = !query || haystack.includes(query);

    const filterPass =
      state.activeFilters.size === 0 ||
      (project.tags || []).some((tag) => state.activeFilters.has(tag.toLowerCase()));

    return searchPass && filterPass;
  }

  function createBadgeList(items) {
    return (items || [])
      .map((item) => `<span class="badge">${escapeHtml(item)}</span>`)
      .join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getProjectDateScore(project) {
    const raw = String(project?.date || "").trim();
    if (!raw) return Number.NEGATIVE_INFINITY;

    const normalized = raw.toLowerCase();
    if (normalized === "present") return Number.POSITIVE_INFINITY;

    const rangeMatch = raw.match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (rangeMatch) {
      const endYear = Number.parseInt(rangeMatch[2], 10);
      if (Number.isFinite(endYear)) return Date.UTC(endYear, 11, 31);
    }

    const yearMatch = raw.match(/^(\d{4})$/);
    if (yearMatch) {
      const year = Number.parseInt(yearMatch[1], 10);
      if (Number.isFinite(year)) return Date.UTC(year, 11, 31);
    }

    const parsed = Date.parse(`1 ${raw}`);
    if (!Number.isNaN(parsed)) return parsed;

    return Number.NEGATIVE_INFINITY;
  }

  function sortProjectsByDateDesc(projects) {
    return [...projects].sort((a, b) => {
      const diff = getProjectDateScore(b) - getProjectDateScore(a);
      if (diff !== 0) return diff;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  function renderProjects() {
    const grid = document.getElementById("projects-grid");
    const emptyState = document.getElementById("empty-state");
    const meta = document.getElementById("results-meta");

    if (!grid || !emptyState || !meta) return;

    const visibleProjects = state.projects.filter(projectMatches);

    meta.textContent = `${visibleProjects.length} of ${state.projects.length} project${
      state.projects.length === 1 ? "" : "s"
    } shown`;

    if (visibleProjects.length === 0) {
      grid.innerHTML = "";
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    grid.innerHTML = visibleProjects
      .map((project) => {
        const impacts = (project.impact || [])
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("");
        const projectDate = project.date
          ? `<p class="project-date">${escapeHtml(project.date)}</p>`
          : "";
        const ctaLabel = project.ctaLabel || "Watch Loom";
        const ctaLink = project.loomUrl || "";
        const siteLabel = project.siteLabel || "View Current Site";
        const siteLink = project.siteUrl || "";
        const actionButtons = [];
        if (ctaLink) {
          actionButtons.push(
            `<a class="btn btn-primary" href="${escapeHtml(ctaLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaLabel)}</a>`
          );
        }
        if (siteLink) {
          actionButtons.push(
            `<a class="btn btn-link" href="${escapeHtml(siteLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(siteLabel)}</a>`
          );
        }
        const ctaBlock = actionButtons.length > 0
          ? `
              <div class="card-actions">
                ${actionButtons.join("")}
              </div>
            `
          : "";
        const screenshotHeading = project.screenshotHeading || "Screenshots";
        const screenshotSources = Array.isArray(project.screenshots) && project.screenshots.length > 0
          ? project.screenshots
          : (project.screenshot ? [project.screenshot] : []);
        const hasVideo = screenshotSources.some((src) => /\.(mp4|mov|webm|ogg)$/i.test(src));
        const screenshotItems = screenshotSources
          .map((src, idx) => {
            const safeSrc = escapeHtml(src);
            const isVideo = /\.(mp4|mov|webm|ogg)$/i.test(src);
            if (isVideo) {
              return `
              <div class="screenshot screenshot-video">
                <video controls preload="metadata" playsinline muted>
                  <source src="${safeSrc}" />
                  Your browser does not support this video format.
                </video>
              </div>
            `;
            }
            return `
              <div class="screenshot">
                <img src="${safeSrc}" alt="Screenshot ${idx + 1} for ${escapeHtml(project.title)}" loading="lazy" />
              </div>
            `;
          })
          .join("");
        const screenshotBlock = screenshotItems
          ? `
              <h4>${escapeHtml(screenshotHeading)}</h4>
              <div class="screenshot-grid${hasVideo ? " has-video" : ""}">
                ${screenshotItems}
              </div>
            `
          : "";

        return `
          <article class="card project-card" id="card-${escapeHtml(project.id)}">
            <div class="project-header">
              <div>
                ${projectDate}
                <h3>${escapeHtml(project.title)}</h3>
                <p class="project-summary">${escapeHtml(project.summary)}</p>
              </div>
              <button class="btn btn-link project-toggle" data-project-id="${escapeHtml(project.id)}" aria-expanded="false" aria-controls="panel-${escapeHtml(project.id)}">Open</button>
            </div>

            <div class="tag-list">${createBadgeList(project.tags)}</div>
            <div class="tool-list">${createBadgeList(project.tools)}</div>

            <section class="project-accordion" id="panel-${escapeHtml(project.id)}" hidden>
              <h4>Problem</h4>
              <p>${escapeHtml(project.problem)}</p>

              <h4>What I Built</h4>
              <p>${escapeHtml(project.built)}</p>

              <h4>Metrics / Impact</h4>
              <ul>${impacts}</ul>

              ${screenshotBlock}

              ${ctaBlock}
            </section>
          </article>
        `;
      })
      .join("");

    registerRevealElements(grid);
    openProjectFromHash();
    syncProjectMediaPlayback();
  }

  function syncProjectMediaPlayback() {
    const videos = Array.from(document.querySelectorAll("#projects-grid .project-accordion video"));
    videos.forEach((video) => {
      video.pause();
      video.muted = true;
    });

    if (mediaObserver) {
      mediaObserver.disconnect();
      mediaObserver = null;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || videos.length === 0 || !("IntersectionObserver" in window)) return;

    mediaObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!(video instanceof HTMLVideoElement)) return;

          const panel = video.closest(".project-accordion");
          const panelVisible = panel ? !panel.hidden : true;
          const shouldPlay = panelVisible && entry.isIntersecting && entry.intersectionRatio >= 0.6;

          if (!shouldPlay) {
            video.pause();
            return;
          }

          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        });
      },
      { threshold: [0.6] }
    );

    videos.forEach((video) => mediaObserver.observe(video));
  }

  function setProjectOpen(projectId, open) {
    const button = document.querySelector(`.project-toggle[data-project-id="${CSS.escape(projectId)}"]`);
    const panel = document.getElementById(`panel-${projectId}`);
    if (!button || !panel) return;

    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Close" : "Open";
    panel.hidden = !open;
    syncProjectMediaPlayback();

    if (open) {
      history.replaceState(null, "", `#${projectId}`);
    }
  }

  function openProjectFromHash() {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;

    const hasProject = state.projects.some((project) => project.id === id);
    if (!hasProject) return;

    setProjectOpen(id, true);
    const card = document.getElementById(`card-${id}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderPromptLibrary() {
    const container = document.getElementById("prompt-library");
    if (!container) return;

    container.innerHTML = state.prompts
      .map(
        (item) => `
          <div class="prompt-item">
            <h4>${escapeHtml(item.title)}</h4>
            <pre>${escapeHtml(item.prompt)}</pre>
            <div class="card-actions">
              <button class="btn btn-link copy-prompt" data-prompt-id="${escapeHtml(item.id)}" type="button">Copy</button>
            </div>
          </div>
        `
      )
      .join("");

    registerRevealElements(container);
  }

  function bindCaseStudiesEvents() {
    const searchInput = document.getElementById("project-search");

    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.search = event.target.value || "";
        renderProjects();
      });
    }

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const filter = (chip.dataset.filter || "").toLowerCase();
        if (!filter) return;

        if (state.activeFilters.has(filter)) {
          state.activeFilters.delete(filter);
          chip.classList.remove("is-active");
          chip.setAttribute("aria-pressed", "false");
        } else {
          state.activeFilters.add(filter);
          chip.classList.add("is-active");
          chip.setAttribute("aria-pressed", "true");
        }

        renderProjects();
      });
    });

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest(".project-toggle");
      if (toggle) {
        const projectId = toggle.dataset.projectId;
        if (!projectId) return;

        const open = toggle.getAttribute("aria-expanded") !== "true";
        setProjectOpen(projectId, open);
        return;
      }

      const copyButton = event.target.closest(".copy-prompt");
      if (copyButton) {
        const promptId = copyButton.dataset.promptId;
        const selected = state.prompts.find((prompt) => prompt.id === promptId);
        if (selected) copyText(selected.prompt);
      }
    });

    window.addEventListener("hashchange", openProjectFromHash);
  }

  async function initCaseStudiesPage() {
    try {
      const data = await loadProjectsData();
      state.projects = sortProjectsByDateDesc(Array.isArray(data.projects) ? data.projects : []);
      state.prompts = Array.isArray(data.promptLibrary) ? data.promptLibrary : [];
      bindCaseStudiesEvents();
      renderProjects();
      renderPromptLibrary();
    } catch (error) {
      const grid = document.getElementById("projects-grid");
      const meta = document.getElementById("results-meta");
      if (meta) meta.textContent = "Could not load project data.";
      if (grid) {
        grid.innerHTML = `<article class="card"><p>${escapeHtml(error.message)}</p></article>`;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initTimeline();
    initMotion();
    if (document.body.dataset.page === "case-studies") {
      initCaseStudiesPage();
    }
  });
})();
