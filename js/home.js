/* ANILOKA — HOME PAGE */
(function () {
  if (!AUTH.requireLogin()) return;

  const session = DB.getSession();
  const all = DB.getAllManga();
  const settings = DB.getSettings();

  /* ---- Hero (featured) ---- */
  const featuredId = settings.featuredIds?.[0];
  const featured = all.find(m => m.id === featuredId) || all[0];
  const heroEl = document.getElementById("hero");
  if (featured) {
    const isIDB = (featured.banner || "").startsWith("idb://");
    heroEl.innerHTML = `
      <img ${isIDB ? `data-src="${featured.banner}"` : `src="${featured.banner}"`} alt="" onerror="this.remove()">
      <div class="hero-content">
        <div class="hero-eyebrow">${icon("star",12)} Featured</div>
        <h1 class="hero-title">${featured.title}</h1>
        <p class="hero-desc">${featured.description}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="reader.html?id=${featured.id}&ch=${featured.chapters[0]?.id || ""}">Read Now</a>
          <a class="btn btn-ghost" href="manga-details.html?id=${featured.id}">More Info</a>
        </div>
      </div>`;
    hydrateImages(heroEl);
  } else {
    heroEl.classList.add("hidden");
  }

  /* ---- Genre strip ---- */
  document.getElementById("genre-strip").innerHTML = GENRES.map(g =>
    `<a class="genre-chip" href="search.html?genre=${encodeURIComponent(g)}">${g}</a>`
  ).join("");

  /* ---- Continue Reading ---- */
  const progress = DB.getProgress(session.uid);
  const continueList = Object.keys(progress)
    .map(id => ({ manga: DB.getManga(id), p: progress[id] }))
    .filter(x => x.manga)
    .sort((a, b) => b.p.updatedAt - a.p.updatedAt)
    .map(x => x.manga);
  renderRail("rail-continue", continueList, { badge: "Continue" });

  /* ---- Rails ---- */
  renderRail("rail-latest", [...all].sort((a, b) => b.year - a.year), { badge: "New", badgeClass: "new" });
  renderRail("rail-trending", all.filter(m => m.trending));
  renderRail("rail-popular", all.filter(m => m.popular));
  renderRail("rail-newchapters", [...all].sort((a, b) => b.chapters.length - a.chapters.length));
  renderRail("rail-recommended", all);
  renderRail("rail-recent", [...all].reverse());

  initNav("home");
  initTopnavSearch();
  hidePageLoader();
})();
