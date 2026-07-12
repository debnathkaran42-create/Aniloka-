/* ANILOKA — LIBRARY PAGE */
(function () {
  if (!AUTH.requireLogin()) return;
  const session = DB.getSession();
  const lib = DB.getLibrary(session.uid);
  const progress = DB.getProgress(session.uid);

  const tabs = {
    favorites: lib.favorites.map(id => DB.getManga(id)).filter(Boolean),
    reading: lib.reading.map(id => DB.getManga(id)).filter(Boolean),
    completed: lib.completed.map(id => DB.getManga(id)).filter(Boolean),
    planToRead: lib.planToRead.map(id => DB.getManga(id)).filter(Boolean),
    history: Object.keys(progress).map(id => DB.getManga(id)).filter(Boolean)
      .sort((a, b) => progress[b.id].updatedAt - progress[a.id].updatedAt)
  };

  const grid = document.getElementById("library-grid");
  function render(tab) {
    const list = tabs[tab] || [];
    grid.innerHTML = list.length
      ? list.map(m => mangaCardHTML(m)).join("")
      : `<div class="empty-state" style="grid-column:1/-1;">
           <h3>Nothing here yet</h3>
           <p>Manga you add to this list will show up here.</p>
           <a class="btn btn-primary" href="home.html">Browse Manga</a>
         </div>`;
    hydrateImages(grid);
  }

  document.querySelectorAll(".library-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".library-tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render(btn.dataset.tab);
    });
  });

  render("favorites");
  initNav("library");
  hidePageLoader();
})();
