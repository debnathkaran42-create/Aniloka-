/* ANILOKA — PROFILE PAGE */
(function () {
  if (!AUTH.requireLogin()) return;
  const session = DB.getSession();
  const user = DB.getUser(session.uid);
  const lib = DB.getLibrary(session.uid);
  const progress = DB.getProgress(session.uid);

  document.getElementById("p-avatar").textContent = (user.avatarInitial || user.username[0]).toUpperCase();
  document.getElementById("p-username").textContent = user.username;
  document.getElementById("p-email").textContent = user.email;
  document.getElementById("premium-pill").classList.toggle("hidden", !user.isPremium);

  document.getElementById("stat-favorites").textContent = lib.favorites.length;
  document.getElementById("stat-reading").textContent = lib.reading.length;
  document.getElementById("stat-completed").textContent = lib.completed.length;
  const bookmarkCount = Object.values(lib.bookmarks).reduce((sum, arr) => sum + arr.length, 0);
  document.getElementById("stat-bookmarks").textContent = bookmarkCount;

  /* ---- Continue Reading ---- */
  const continueList = Object.keys(progress).map(id => DB.getManga(id)).filter(Boolean);
  renderRail("rail-continue", continueList);
  document.getElementById("panel-continue").querySelector(".rail-wrap")?.classList.toggle("hidden", !continueList.length);

  /* ---- Favorites ---- */
  const favManga = lib.favorites.map(id => DB.getManga(id)).filter(Boolean);
  renderGrid("grid-favorites", favManga);

  /* ---- Bookmarks ---- */
  const bookmarkList = Object.entries(lib.bookmarks).flatMap(([mangaId, chIds]) => {
    const m = DB.getManga(mangaId);
    if (!m) return [];
    return chIds.map(chId => {
      const ch = m.chapters.find(c => c.id === chId);
      return ch ? { manga: m, chapter: ch } : null;
    }).filter(Boolean);
  });
  document.getElementById("bookmark-list").innerHTML = bookmarkList.length
    ? bookmarkList.map(b => `
      <a class="chapter-row" href="reader.html?id=${b.manga.id}&ch=${b.chapter.id}" style="display:flex; text-decoration:none;">
        <div class="ch-left"><span class="ch-num">${icon("bookmarkFilled",16)}</span><span><div class="ch-title">${b.manga.title} — ${b.chapter.title}</div></span></div>
      </a>`).join("")
    : `<div class="empty-state"><p>No bookmarked chapters yet.</p></div>`;

  /* ---- Downloads (placeholder, offline reading not enabled without storage backend) ---- */
  document.getElementById("downloads-list").innerHTML = `<div class="empty-state"><h3>No downloads</h3><p>Offline downloads will appear here once enabled.</p></div>`;

  /* ---- Purchase history ---- */
  const purchases = DB._read("aniloka_purchases_" + session.uid, []);
  document.getElementById("purchase-list").innerHTML = purchases.length
    ? purchases.map(p => `<div class="purchase-row"><span>${p.plan} Plan</span><span>${p.date}</span></div>`).join("")
    : `<div class="empty-state"><p>No purchases yet.</p></div>`;

  /* ---- Settings ---- */
  document.getElementById("setting-notify").checked = user.settings?.notify !== false;

  document.getElementById("setting-notify").addEventListener("change", (e) => {
    DB.saveUser(session.uid, { settings: { ...(user.settings || {}), notify: e.target.checked } });
    toast("Preference saved", "success");
  });

  document.getElementById("edit-username-btn").addEventListener("click", () => {
    const name = prompt("Update your username", user.username);
    if (name && name.trim().length >= 3) {
      DB.saveUser(session.uid, { username: name.trim(), avatarInitial: name.trim()[0].toUpperCase() });
      DB.setSession({ ...session, username: name.trim() });
      toast("Username updated", "success");
      setTimeout(() => location.reload(), 500);
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => AUTH.logout());

  /* ---- Tabs ---- */
  document.querySelectorAll(".profile-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".profile-tabs button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.remove("hidden");
    });
  });

  function renderGrid(id, list) {
    const el = document.getElementById(id);
    el.innerHTML = list.length ? list.map(m => mangaCardHTML(m)).join("") : `<div class="empty-state"><p>Nothing here yet.</p></div>`;
    hydrateImages(el);
  }

  /* ---- Hidden admin entry point ----
     Normal users just see the logo (tapping it does nothing special — there's
     no public "Admin" link anywhere in the nav). Tapping it 7 times within 3
     seconds reveals a one-time "Admin Panel" link in Settings. If a real
     backend is connected, the admin route is still protected server-side
     regardless of whether someone finds this gesture. */
  const secretLogo = document.getElementById("secret-tap-logo");
  let tapCount = 0, tapTimer = null;
  secretLogo?.addEventListener("click", () => {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 3000);

    if (tapCount === 1) {
      // Single tap still behaves like a normal logo — go home, unless more taps follow fast.
      tapTimer = setTimeout(() => { if (tapCount === 1) window.location.href = "home.html"; tapCount = 0; }, 600);
    }
    if (tapCount >= 7) {
      clearTimeout(tapTimer);
      tapCount = 0;
      document.getElementById("admin-entry-row")?.classList.remove("hidden");
      document.querySelector('[data-tab="settings"]')?.click();
      toast("Admin access unlocked", "success");
    }
  });

  initNav("profile");
  hidePageLoader();
})();
