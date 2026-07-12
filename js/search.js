/* ANILOKA — SEARCH PAGE */
(function () {
  if (!AUTH.requireLogin()) return;

  const genreSelect = document.getElementById("filter-genre");
  genreSelect.innerHTML = `<option value="">All Genres</option>` + GENRES.map(g => `<option value="${g}">${g}</option>`).join("");

  const els = {
    q: document.getElementById("search-input"),
    genre: genreSelect,
    author: document.getElementById("filter-author"),
    publisher: document.getElementById("filter-publisher"),
    year: document.getElementById("filter-year"),
    grid: document.getElementById("results-grid"),
    count: document.getElementById("results-count"),
  };

  function runSearch() {
    const params = {
      q: els.q.value, genre: els.genre.value, author: els.author.value,
      publisher: els.publisher.value, year: els.year.value
    };
    const results = DB.searchManga(params);
    els.count.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
    els.grid.innerHTML = results.length
      ? results.map(m => mangaCardHTML(m)).join("")
      : `<div class="empty-state" style="grid-column:1/-1;"><h3>No matches</h3><p>Try a different title, genre, or author.</p></div>`;
    hydrateImages(els.grid);

    const url = new URL(window.location);
    Object.entries(params).forEach(([k, v]) => v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
    window.history.replaceState({}, "", url);
  }

  [els.q, els.author, els.publisher, els.year].forEach(el => el.addEventListener("input", runSearch));
  els.genre.addEventListener("change", runSearch);

  // Preload from URL params
  els.q.value = qs("q") || "";
  els.genre.value = qs("genre") || "";
  els.author.value = qs("author") || "";
  els.publisher.value = qs("publisher") || "";
  els.year.value = qs("year") || "";
  runSearch();

  initNav("search");
  hidePageLoader();
})();
