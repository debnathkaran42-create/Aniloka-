/* ANILOKA — READER ENGINE */
(function () {
  if (!AUTH.requireLogin()) return;
  const session = DB.getSession();
  const mangaId = qs("id");
  const manga = DB.getManga(mangaId);
  const root = document.getElementById("reader-root");

  if (!manga) {
    root.innerHTML = `<div class="empty-state"><h3>Manga not found</h3><a class="btn btn-primary" href="home.html">Back to Home</a></div>`;
    hidePageLoader();
    return;
  }

  let chapterId = qs("ch") || manga.chapters[0]?.id;
  let chapter = manga.chapters.find(c => c.id === chapterId) || manga.chapters[0];

  if (chapter && !DB.canAccessChapter(session.uid, manga.id, chapter)) {
    window.location.href = `manga-details.html?id=${manga.id}&locked=${chapter.id}`;
    return;
  }

  function chapterPageCount(ch) {
    if (ch?.pageKeys?.length) return ch.pageKeys.length;
    return Math.max(ch?.pages || 0, 8); // placeholder count if no real pages set yet
  }

  const state = {
    mode: localStorage.getItem("aniloka_reader_mode") || "vertical", // vertical | horizontal
    direction: localStorage.getItem("aniloka_reader_dir") || "ltr",  // ltr | rtl
    theme: localStorage.getItem("aniloka_reader_theme") || "dark",
    zoom: 1,
    brightness: 0,
    page: 1,
    totalPages: chapterPageCount(chapter)
  };

  const viewport = document.getElementById("reader-viewport");
  const bar = {
    top: document.getElementById("reader-topbar"),
    bottom: document.getElementById("reader-bottombar"),
    slider: document.getElementById("page-slider"),
    count: document.getElementById("page-count"),
    mTitle: document.getElementById("r-manga-title"),
    chTitle: document.getElementById("r-chapter-title"),
    chSelect: document.getElementById("chapter-select"),
    bookmarkBtn: document.getElementById("bookmark-btn"),
  };

  function pageImgSrc(n) {
    // Uploaded-from-gallery chapters store explicit idb keys in order
    if (chapter?.pageKeys && chapter.pageKeys[n - 1]) return "idb://" + chapter.pageKeys[n - 1];
    return `images/manga/chapters/${manga.id}/${chapter.id}/${n}.jpg`;
  }

  function buildPages() {
    let html = "";
    for (let i = 1; i <= state.totalPages; i++) {
      const src = pageImgSrc(i);
      const isIDB = src.startsWith("idb://");
      html += `
      <div class="r-page" data-page="${i}">
        <img ${isIDB ? `data-src="${src}"` : `src="${src}"`} alt="Page ${i}" loading="lazy"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <div class="page-placeholder" style="display:none">
          <b>${String(i).padStart(2, "0")}</b>
          <span>Page ${i} of ${chapter.title}</span>
          <code>${isIDB ? "" : src}</code>
        </div>
      </div>`;
    }
    viewport.innerHTML = html;
    viewport.className = "reader-viewport mode-" + state.mode + (state.mode === "horizontal" && state.direction === "rtl" ? " rtl" : "");
    hydrateImages(viewport);
  }

  function applyZoom() {
    document.querySelectorAll(".r-page img").forEach(img => img.style.transform = `scale(${state.zoom})`);
  }

  function applyBrightness() {
    document.getElementById("brightness-overlay").style.opacity = state.brightness;
  }

  function applyTheme() {
    document.body.classList.toggle("reader-light", state.theme === "light");
    localStorage.setItem("aniloka_reader_theme", state.theme);
  }

  function updateHeader() {
    bar.mTitle.textContent = manga.title;
    bar.chTitle.textContent = chapter.title;
    bar.chSelect.innerHTML = manga.chapters.map(c => {
      const locked = !DB.canAccessChapter(session.uid, manga.id, c);
      return `<option value="${c.id}" ${c.id === chapter.id ? "selected" : ""}>${locked ? "(Locked) " : ""}${c.title}</option>`;
    }).join("");
    bar.count.textContent = `${state.page} / ${state.totalPages}`;
    bar.slider.max = state.totalPages;
    bar.slider.value = state.page;
    syncBookmark();
  }

  function syncBookmark() {
    const bookmarks = DB.getLibrary(session.uid).bookmarks[manga.id] || [];
    bar.bookmarkBtn.classList.toggle("active", bookmarks.includes(chapter.id));
  }

  function goToPage(n, { scroll = true } = {}) {
    n = Math.max(1, Math.min(state.totalPages, n));
    state.page = n;
    bar.count.textContent = `${state.page} / ${state.totalPages}`;
    bar.slider.value = state.page;
    if (scroll) {
      const target = viewport.querySelector(`.r-page[data-page="${n}"]`);
      if (target) target.scrollIntoView({ behavior: state.mode === "horizontal" ? "auto" : "smooth", inline: "start", block: "start" });
    }
  }

  function nextPage() {
    if (state.page >= state.totalPages) { goNextChapter(); return; }
    goToPage(state.page + 1);
  }
  function prevPage() {
    if (state.page <= 1) { goPrevChapter(); return; }
    goToPage(state.page - 1);
  }

  function chapterIndex() { return manga.chapters.findIndex(c => c.id === chapter.id); }
  function goNextChapter() {
    const i = chapterIndex();
    if (i < manga.chapters.length - 1) loadChapter(manga.chapters[i + 1].id);
    else toast("You're all caught up — no more chapters yet.", "info");
  }
  function goPrevChapter() {
    const i = chapterIndex();
    if (i > 0) loadChapter(manga.chapters[i - 1].id);
  }

  function loadChapter(id) {
    const target = manga.chapters.find(c => c.id === id);
    if (target && !DB.canAccessChapter(session.uid, manga.id, target)) {
      window.location.href = `manga-details.html?id=${manga.id}&locked=${target.id}`;
      return;
    }
    chapter = target;
    chapterId = id;
    state.totalPages = chapterPageCount(chapter);
    state.page = 1;
    const url = new URL(window.location);
    url.searchParams.set("ch", id);
    window.history.replaceState({}, "", url);
    buildPages();
    applyZoom();
    updateHeader();
    saveProgress();
    window.scrollTo(0, 0);
  }

  function saveProgress() {
    DB.saveProgress(session.uid, manga.id, chapter.id, state.page);
  }

  /* ---- Init ---- */
  buildPages();
  updateHeader();
  applyTheme();

  // Resume from saved progress if present and matches this chapter
  const saved = DB.getProgress(session.uid)[manga.id];
  if (saved && saved.chapterId === chapter.id && saved.page) {
    setTimeout(() => goToPage(saved.page), 100);
  }

  /* ---- Controls ---- */
  document.getElementById("back-btn").addEventListener("click", () => window.location.href = `manga-details.html?id=${manga.id}`);
  document.getElementById("next-btn").addEventListener("click", nextPage);
  document.getElementById("prev-btn").addEventListener("click", prevPage);
  document.getElementById("tap-left").addEventListener("click", () => state.direction === "rtl" ? nextPage() : prevPage());
  document.getElementById("tap-right").addEventListener("click", () => state.direction === "rtl" ? prevPage() : nextPage());

  bar.slider.addEventListener("input", (e) => goToPage(parseInt(e.target.value, 10)));
  bar.chSelect.addEventListener("change", (e) => loadChapter(e.target.value));

  bar.bookmarkBtn.addEventListener("click", () => {
    DB.toggleBookmark(session.uid, manga.id, chapter.id);
    syncBookmark();
    toast(bar.bookmarkBtn.classList.contains("active") ? "Chapter bookmarked" : "Bookmark removed", "success");
  });

  // Tools panel
  const toolsPanel = document.getElementById("tools-panel");
  document.getElementById("tools-btn").addEventListener("click", () => toolsPanel.classList.toggle("open"));

  document.querySelectorAll("#mode-toggle button").forEach(btn => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      localStorage.setItem("aniloka_reader_mode", state.mode);
      document.querySelectorAll("#mode-toggle button").forEach(b => b.classList.toggle("active", b === btn));
      buildPages(); applyZoom(); goToPage(state.page, { scroll: false });
    });
  });
  document.querySelectorAll("#mode-toggle button").forEach(b => b.classList.toggle("active", b.dataset.mode === state.mode));

  document.getElementById("direction-toggle").addEventListener("click", (e) => {
    state.direction = state.direction === "ltr" ? "rtl" : "ltr";
    localStorage.setItem("aniloka_reader_dir", state.direction);
    e.target.innerHTML = state.direction === "ltr"
      ? `Left ${icon("arrowRight", 13)} Right`
      : `Right ${icon("arrowRight", 13)} Left`;
    buildPages(); applyZoom();
  });

  document.getElementById("theme-toggle").addEventListener("click", (e) => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    e.target.textContent = state.theme === "dark" ? "Dark Mode" : "Light Mode";
  });

  document.getElementById("zoom-range").addEventListener("input", (e) => {
    state.zoom = parseFloat(e.target.value);
    applyZoom();
  });

  document.getElementById("brightness-range").addEventListener("input", (e) => {
    state.brightness = parseFloat(e.target.value);
    applyBrightness();
  });

  document.getElementById("fullscreen-btn").addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  // Auto-hide bars on tap (vertical mode) / show controls
  let barsVisible = true;
  document.getElementById("toggle-bars-zone").addEventListener("click", () => {
    barsVisible = !barsVisible;
    bar.top === document.getElementById("reader-topbar");
    document.getElementById("reader-topbar").classList.toggle("hide", !barsVisible);
    document.getElementById("reader-bottombar").classList.toggle("hide", !barsVisible);
  });

  // Pinch-to-zoom readiness (basic two-finger pinch)
  let pinchStartDist = null, pinchStartZoom = 1;
  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      pinchStartDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchStartZoom = state.zoom;
    }
  }, { passive: true });
  viewport.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && pinchStartDist) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      state.zoom = Math.max(0.6, Math.min(2.5, pinchStartZoom * (dist / pinchStartDist)));
      document.getElementById("zoom-range").value = state.zoom;
      applyZoom();
    }
  }, { passive: true });
  viewport.addEventListener("touchend", (e) => { if (e.touches.length < 2) pinchStartDist = null; });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") state.direction === "rtl" ? prevPage() : nextPage();
    if (e.key === "ArrowLeft") state.direction === "rtl" ? nextPage() : prevPage();
    if (e.key === "Escape") toolsPanel.classList.remove("open");
  });

  // Track scroll position in vertical mode → update page indicator
  if (state.mode === "vertical") {
    viewport.addEventListener("scroll", () => {
      const pages = [...viewport.querySelectorAll(".r-page")];
      const vpTop = viewport.getBoundingClientRect().top;
      let closest = 1, minDist = Infinity;
      pages.forEach(p => {
        const d = Math.abs(p.getBoundingClientRect().top - vpTop);
        if (d < minDist) { minDist = d; closest = parseInt(p.dataset.page, 10); }
      });
      state.page = closest;
      bar.count.textContent = `${state.page} / ${state.totalPages}`;
      bar.slider.value = state.page;
    }, { passive: true });
  }

  // Autosave every 10 seconds
  setInterval(saveProgress, 10000);
  window.addEventListener("beforeunload", saveProgress);

  initContentProtection(session, manga, chapter);

  initNav("");
  hidePageLoader();
})();

/* ---------------------------------------------------------
   Content protection — DETERRENT ONLY.
   -----------------------------------------------------------
   No website can truly block a screenshot or screen recording;
   the OS/another app can always capture the screen. What this
   *can* do: make casual sharing less appealing and traceable —
   a personal watermark on every page, and hiding pages the
   instant the tab loses focus (which also interrupts most
   screen-recording apps that need to switch away to start).
   --------------------------------------------------------- */
function initContentProtection(session, manga, chapter) {
  // Tiled watermark: username + a short timestamp, traces any leaked copy back to the account
  const wm = document.getElementById("watermark-overlay");
  const stamp = `${session.username} • ${new Date().toLocaleDateString()}`;
  wm.innerHTML = Array.from({ length: 40 }, () => `<span>${stamp}</span>`).join("");

  const blurOverlay = document.getElementById("protection-blur");
  function showBlur() { blurOverlay.classList.add("show"); }
  function hideBlur() { blurOverlay.classList.remove("show"); }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) showBlur(); else hideBlur();
  });
  window.addEventListener("blur", showBlur);
  window.addEventListener("focus", hideBlur);

  // Disable right-click / long-press save-image menu on pages
  document.getElementById("reader-viewport").addEventListener("contextmenu", (e) => e.preventDefault());

  // Best-effort PrintScreen deterrence (desktop browsers only; OS-level capture can't be blocked from the web)
  document.addEventListener("keyup", (e) => {
    if (e.key === "PrintScreen") {
      showBlur();
      toast("Screenshots aren't supported for protected content.", "error");
      navigator.clipboard?.writeText("").catch(() => {});
      setTimeout(hideBlur, 1500);
    }
  });
  // Common screenshot/recording shortcuts (best-effort only, not foolproof)
  document.addEventListener("keydown", (e) => {
    const combo = (e.metaKey || e.ctrlKey) && e.shiftKey && ["s", "S", "3", "4", "5"].includes(e.key);
    if (combo) { e.preventDefault(); toast("Screenshots aren't supported for protected content.", "error"); }
  });
}
