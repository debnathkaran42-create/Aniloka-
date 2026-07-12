/* =========================================================
   ANILOKA — ADMIN PANEL
   -----------------------------------------------------------
   Protection: a simple hardcoded admin email/password check.
   This is NOT secure for a real production deployment (anyone
   who reads this file's source can see the check) — swap for
   a real backend-verified admin role before going live.
   ========================================================= */

const ADMIN_CREDENTIALS = { email: "aniloka@admin.com", password: "KarnaTejas67" };
const ADMIN_SESSION_KEY = "aniloka_admin_session";

/* ---------------- Auth gate ---------------- */
(function gate() {
  const loginScreen = document.getElementById("admin-login-screen");
  const shell = document.getElementById("admin-shell");

  function showApp() {
    loginScreen.classList.add("hidden");
    shell.classList.remove("hidden");
    initAdminApp();
  }

  if (localStorage.getItem(ADMIN_SESSION_KEY) === "true") { showApp(); return; }

  document.getElementById("admin-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value.trim().toLowerCase();
    const password = document.getElementById("admin-password").value;
    const err = document.getElementById("admin-login-error");
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      localStorage.setItem(ADMIN_SESSION_KEY, "true");
      showApp();
    } else {
      err.textContent = "Incorrect admin email or password.";
      err.classList.add("show");
    }
  });
})();

/* ---------------- Main admin app ---------------- */
function initAdminApp() {
  const genreListEl = document.getElementById("genre-checklist");
  genreListEl.innerHTML = GENRES.map(g => `
    <label class="checkbox-row" style="margin:4px 10px 4px 0; display:inline-flex;">
      <input type="checkbox" name="genre" value="${g}"> ${g}
    </label>`).join("");

  /* ---- Sidebar nav ---- */
  document.querySelectorAll(".admin-nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-panel-section").forEach(s => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("section-" + btn.dataset.section).classList.add("active");
      document.getElementById("admin-sidebar").classList.remove("open");
      renderAll();
    });
  });
  document.getElementById("admin-hamburger").addEventListener("click", () => document.getElementById("admin-sidebar").classList.toggle("open"));

  document.getElementById("admin-logout-btn").addEventListener("click", () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    location.reload();
  });

  function renderAll() {
    renderDashboard();
    renderMangaTable();
    renderChapterMangaSelect();
    renderUsersTable();
    renderAdsSettings();
    renderPremiumSettings();
    renderPayments();
    renderHomepageSettings();
    renderSiteSettings();
  }

  /* ---------------- Dashboard ---------------- */
  function renderDashboard() {
    const all = DB.getAllManga();
    const users = DB.getUsers();
    const chapterCount = all.reduce((s, m) => s + m.chapters.length, 0);
    document.getElementById("stat-manga").textContent = all.length;
    document.getElementById("stat-chapters").textContent = chapterCount;
    document.getElementById("stat-users").textContent = Object.keys(users).length;
    document.getElementById("stat-premium").textContent = Object.values(users).filter(u => u.isPremium).length;
    document.getElementById("stat-pending-payments").textContent = DB.getPayments().filter(p => p.status === "pending").length;

    const log = DB.getAdminLog();
    document.getElementById("admin-log").innerHTML = log.length
      ? log.slice(0, 10).map(l => `<div class="purchase-row"><span>${l.action}</span><span>${new Date(l.at).toLocaleString()}</span></div>`).join("")
      : `<div class="empty-state"><p>No admin activity yet.</p></div>`;
  }

  /* ---------------- Manga CRUD ---------------- */
  const mangaForm = document.getElementById("manga-form");
  let editingMangaId = null;
  let draftMangaId = null;      // used to key uploaded images before the manga is first saved
  let pendingCoverValue = null; // "idb://cover:<id>" or a path string, or null
  let pendingBannerValue = null;

  function newDraftId() { return "manga-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function resetMangaForm() {
    mangaForm.reset();
    editingMangaId = null;
    draftMangaId = newDraftId();
    pendingCoverValue = null;
    pendingBannerValue = null;
    document.getElementById("manga-form-title").textContent = "Add Manga";
    document.getElementById("manga-id-hint").textContent = "";
    genreListEl.querySelectorAll("input").forEach(cb => cb.checked = false);
    renderImgPreview("cover", null);
    renderImgPreview("banner", null);
  }
  document.getElementById("manga-form-cancel").addEventListener("click", resetMangaForm);

  async function renderImgPreview(kind, value) {
    const preview = document.getElementById(kind + "-preview");
    const removeBtn = document.getElementById(kind + "-remove-btn");
    if (!value) {
      preview.innerHTML = `<span>No ${kind} yet</span>`;
      removeBtn.classList.add("hidden");
      return;
    }
    let src = value;
    if (value.startsWith("idb://")) {
      src = await AssetStore.getObjectURL(value.slice(6)) || "";
    }
    preview.innerHTML = `<img src="${src}" alt="${kind}">`;
    removeBtn.classList.remove("hidden");
  }

  function wireImgPicker(kind, currentIdGetter) {
    const addBtn = document.getElementById(kind + "-add-btn");
    const removeBtn = document.getElementById(kind + "-remove-btn");
    const fileInput = document.getElementById(kind + "-file-input");

    addBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const id = currentIdGetter();
      const key = `${kind}:${id}`;
      await AssetStore.put(key, file);
      const value = "idb://" + key;
      if (kind === "cover") pendingCoverValue = value; else pendingBannerValue = value;
      renderImgPreview(kind, value);
      fileInput.value = "";
    });
    removeBtn.addEventListener("click", async () => {
      const id = currentIdGetter();
      await AssetStore.del(`${kind}:${id}`);
      if (kind === "cover") pendingCoverValue = null; else pendingBannerValue = null;
      renderImgPreview(kind, null);
    });
  }
  wireImgPicker("cover", () => editingMangaId || draftMangaId);
  wireImgPicker("banner", () => editingMangaId || draftMangaId);

  mangaForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("m-form-title").value.trim();
    if (!title) return;
    const id = editingMangaId || draftMangaId;
    const selectedGenres = [...genreListEl.querySelectorAll("input:checked")].map(cb => cb.value);
    const existing = editingMangaId ? DB.getManga(editingMangaId) : null;

    const manga = {
      id,
      title,
      author: document.getElementById("m-form-author").value.trim() || "Unknown",
      artist: document.getElementById("m-form-artist").value.trim() || "Unknown",
      publisher: document.getElementById("m-form-publisher").value.trim() || "Unknown",
      year: parseInt(document.getElementById("m-form-year").value, 10) || new Date().getFullYear(),
      status: document.getElementById("m-form-status").value,
      rating: parseFloat(document.getElementById("m-form-rating").value) || 0,
      genres: selectedGenres,
      description: document.getElementById("m-form-desc").value.trim(),
      cover: pendingCoverValue || existing?.cover || `images/manga/covers/${id}.jpg`,
      banner: pendingBannerValue || existing?.banner || `images/manga/banners/${id}.jpg`,
      featured: document.getElementById("m-form-featured").checked,
      trending: document.getElementById("m-form-trending").checked,
      popular: document.getElementById("m-form-popular").checked,
      chapters: existing?.chapters || []
    };

    DB.saveManga(manga);
    DB.logAdmin(`${editingMangaId ? "Edited" : "Added"} manga "${title}"`);
    toast(`Manga "${title}" saved`, "success");
    resetMangaForm();
    renderMangaTable();
    renderChapterMangaSelect();
  });

  function renderMangaTable() {
    const all = DB.getAllManga();
    document.getElementById("manga-table-body").innerHTML = all.length ? all.map(m => `
      <tr>
        <td>${m.title}</td>
        <td>${m.author}</td>
        <td>${m.chapters.length}</td>
        <td>${m.status}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" data-edit="${m.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${m.id}">Delete</button>
          </div>
        </td>
      </tr>`).join("") : `<tr><td colspan="5"><div class="empty-state"><p>No manga yet — add your first one above.</p></div></td></tr>`;

    document.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => loadMangaIntoForm(btn.dataset.edit)));
    document.querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
      const m = DB.getManga(btn.dataset.delete);
      if (!confirm(`Delete "${m.title}" and all its chapters? This cannot be undone.`)) return;
      DB.deleteManga(btn.dataset.delete);
      await AssetStore.delPrefix(`cover:${m.id}`);
      await AssetStore.delPrefix(`banner:${m.id}`);
      await AssetStore.delPrefix(`page:${m.id}:`);
      DB.logAdmin(`Deleted manga "${m.title}"`);
      renderMangaTable(); renderChapterMangaSelect(); renderHomepageSettings();
      toast("Manga deleted", "success");
    }));
  }

  function loadMangaIntoForm(id) {
    const m = DB.getManga(id);
    if (!m) return;
    editingMangaId = id;
    pendingCoverValue = m.cover || null;
    pendingBannerValue = m.banner || null;
    document.getElementById("manga-form-title").textContent = "Edit Manga";
    document.getElementById("manga-id-hint").textContent = `ID: ${id}`;
    document.getElementById("m-form-title").value = m.title;
    document.getElementById("m-form-author").value = m.author;
    document.getElementById("m-form-artist").value = m.artist;
    document.getElementById("m-form-publisher").value = m.publisher;
    document.getElementById("m-form-year").value = m.year;
    document.getElementById("m-form-status").value = m.status;
    document.getElementById("m-form-rating").value = m.rating;
    document.getElementById("m-form-desc").value = m.description;
    renderImgPreview("cover", m.cover);
    renderImgPreview("banner", m.banner);
    document.getElementById("m-form-featured").checked = m.featured;
    document.getElementById("m-form-trending").checked = m.trending;
    document.getElementById("m-form-popular").checked = m.popular;
    genreListEl.querySelectorAll("input").forEach(cb => cb.checked = m.genres.includes(cb.value));
    document.querySelector('[data-section="manga"]').click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  resetMangaForm(); // establish an initial draft ID so images can be picked before first save

  /* ---------------- Chapters CRUD ---------------- */
  const chMangaSelect = document.getElementById("ch-manga-select");
  const chapterForm = document.getElementById("chapter-form");
  let editingChapterId = null;
  let draftChapterId = null;
  let pendingPageKeys = []; // ordered list of AssetStore keys (without "page:" prefix... actually WITH prefix, see below)

  function newDraftChapterId() { return "ch-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  function renderChapterMangaSelect() {
    const all = DB.getAllManga();
    chMangaSelect.innerHTML = all.map(m => `<option value="${m.id}">${m.title}</option>`).join("") || `<option value="">No manga yet</option>`;
    renderChapterTable();
  }
  chMangaSelect.addEventListener("change", () => { renderChapterTable(); showChapterPathHint(); });

  function currentChapterManga() { return DB.getManga(chMangaSelect.value); }

  function renderChapterTable() {
    const manga = currentChapterManga();
    const body = document.getElementById("chapter-table-body");
    if (!manga) { body.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>Add a manga first.</p></div></td></tr>`; return; }
    body.innerHTML = manga.chapters.length ? manga.chapters.map(c => `
      <tr>
        <td>${c.number}</td>
        <td>${c.title}</td>
        <td>${c.pageKeys?.length || c.pages || 0}</td>
        <td>${c.paid ? `₹${Number(c.price || 0).toFixed(2)}` : "Free"}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" data-edit-ch="${c.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete-ch="${c.id}">Delete</button>
          </div>
        </td>
      </tr>`).join("") : `<tr><td colspan="5"><div class="empty-state"><p>No chapters yet.</p></div></td></tr>`;

    document.querySelectorAll("[data-edit-ch]").forEach(btn => btn.addEventListener("click", () => loadChapterIntoForm(btn.dataset.editCh)));
    document.querySelectorAll("[data-delete-ch]").forEach(btn => btn.addEventListener("click", async () => {
      const manga = currentChapterManga();
      const ch = manga.chapters.find(c => c.id === btn.dataset.deleteCh);
      manga.chapters = manga.chapters.filter(c => c.id !== btn.dataset.deleteCh);
      DB.saveManga(manga);
      if (ch) await AssetStore.delPrefix(`page:${manga.id}:${ch.id}:`);
      DB.logAdmin(`Deleted a chapter from "${manga.title}"`);
      renderChapterTable(); renderMangaTable();
      toast("Chapter deleted", "success");
    }));
  }

  async function renderPageThumbGrid() {
    const grid = document.getElementById("page-thumb-grid");
    document.getElementById("page-count-label").textContent = `${pendingPageKeys.length} page${pendingPageKeys.length === 1 ? "" : "s"}`;
    if (!pendingPageKeys.length) { grid.innerHTML = ""; return; }
    grid.innerHTML = pendingPageKeys.map((key, i) => `
      <div class="page-thumb" data-idx="${i}">
        <span class="num">${i + 1}</span>
        <img data-key="${key}" alt="Page ${i + 1}">
        <button type="button" class="remove" data-remove-idx="${i}">${icon("close",12)}</button>
      </div>`).join("");
    for (const img of grid.querySelectorAll("img[data-key]")) {
      const url = await AssetStore.getObjectURL(img.dataset.key);
      if (url) img.src = url;
    }
    grid.querySelectorAll("[data-remove-idx]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const i = parseInt(btn.dataset.removeIdx, 10);
        await AssetStore.del(pendingPageKeys[i]);
        pendingPageKeys.splice(i, 1);
        renderPageThumbGrid();
      });
    });
  }

  document.getElementById("pages-add-btn").addEventListener("click", () => document.getElementById("pages-file-input").click());
  document.getElementById("pages-file-input").addEventListener("change", async (e) => {
    const manga = currentChapterManga();
    if (!manga) { toast("Select a manga first", "error"); return; }
    const chId = editingChapterId || draftChapterId;
    const files = [...e.target.files];
    for (const file of files) {
      const n = pendingPageKeys.length + 1;
      const key = `page:${manga.id}:${chId}:${n}`;
      await AssetStore.put(key, file);
      pendingPageKeys.push(key);
    }
    await renderPageThumbGrid();
    e.target.value = "";
  });

  function resetChapterForm() {
    chapterForm.reset();
    editingChapterId = null;
    draftChapterId = newDraftChapterId();
    pendingPageKeys = [];
    document.getElementById("chapter-form-title").textContent = "Add Chapter";
    document.getElementById("ch-path-hint").textContent = "";
    renderPageThumbGrid();
    showChapterPathHint();
  }
  document.getElementById("chapter-form-cancel").addEventListener("click", resetChapterForm);

  chapterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const manga = currentChapterManga();
    if (!manga) { toast("Add a manga first", "error"); return; }
    const number = parseInt(document.getElementById("ch-form-number").value, 10);
    const title = document.getElementById("ch-form-title").value.trim() || `Chapter ${number}`;
    const date = document.getElementById("ch-form-date").value || new Date().toISOString().slice(0, 10);
    const manualPages = parseInt(document.getElementById("ch-form-pages").value, 10) || 0;
    const paid = document.getElementById("ch-form-paid").checked;
    const price = paid ? (parseFloat(document.getElementById("ch-form-price").value) || 0) : 0;
    const id = editingChapterId || draftChapterId;
    const chapterData = { id, number, title, date, paid, price };
    if (pendingPageKeys.length) {
      chapterData.pageKeys = pendingPageKeys; // full keys, e.g. "page:manga-1:ch-1:1"
      chapterData.pages = pendingPageKeys.length;
    } else {
      chapterData.pages = manualPages;
    }

    if (editingChapterId) {
      const idx = manga.chapters.findIndex(c => c.id === editingChapterId);
      manga.chapters[idx] = chapterData;
    } else {
      manga.chapters.push(chapterData);
    }
    manga.chapters.sort((a, b) => a.number - b.number);
    DB.saveManga(manga);
    DB.logAdmin(`Saved chapter "${title}" for "${manga.title}"`);
    toast("Chapter saved", "success");
    resetChapterForm();
    renderChapterTable();
    renderMangaTable();
  });

  function loadChapterIntoForm(chId) {
    const manga = currentChapterManga();
    const c = manga.chapters.find(c => c.id === chId);
    if (!c) return;
    editingChapterId = chId;
    pendingPageKeys = c.pageKeys ? [...c.pageKeys] : [];
    document.getElementById("chapter-form-title").textContent = "Edit Chapter";
    document.getElementById("ch-form-number").value = c.number;
    document.getElementById("ch-form-title").value = c.title;
    document.getElementById("ch-form-date").value = c.date;
    document.getElementById("ch-form-pages").value = c.pageKeys?.length ? "" : (c.pages || "");
    document.getElementById("ch-form-paid").checked = !!c.paid;
    document.getElementById("ch-form-price").value = c.price || "";
    renderPageThumbGrid();
    showChapterPathHint();
  }

  function showChapterPathHint() {
    const manga = currentChapterManga();
    const chId = editingChapterId || draftChapterId || "ch-id";
    document.getElementById("ch-path-hint").textContent = pendingPageKeys.length
      ? `${pendingPageKeys.length} page image(s) uploaded and stored in this browser's local storage system.`
      : `Folder method (optional): place images at images/manga/chapters/${manga?.id}/${chId}/1.jpg, 2.jpg… matching the manual page count.`;
  }
  document.getElementById("ch-form-pages").addEventListener("input", showChapterPathHint);
  resetChapterForm(); // establish an initial draft chapter ID

  /* ---------------- Users ---------------- */
  function renderUsersTable() {
    const users = DB.getUsers();
    const rows = Object.entries(users);
    document.getElementById("users-table-body").innerHTML = rows.length ? rows.map(([uid, u]) => `
      <tr>
        <td>${escapeHTML(u.username)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>${u.isPremium ? `Premium (${u.premiumPlan || "-"})` : "Free"}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" data-toggle-premium="${uid}">${u.isPremium ? "Revoke Premium" : "Grant Premium"}</button>
          </div>
        </td>
      </tr>`).join("") : `<tr><td colspan="4"><div class="empty-state"><p>No registered users yet.</p></div></td></tr>`;

    document.querySelectorAll("[data-toggle-premium]").forEach(btn => btn.addEventListener("click", () => {
      const uid = btn.dataset.togglePremium;
      const u = DB.getUser(uid);
      DB.saveUser(uid, { isPremium: !u.isPremium, premiumPlan: !u.isPremium ? "monthly" : null });
      DB.logAdmin(`${!u.isPremium ? "Granted" : "Revoked"} premium for ${u.username}`);
      renderUsersTable(); renderDashboard();
      toast("User updated", "success");
    }));
  }

  /* ---------------- Ads ---------------- */
  function renderAdsSettings() {
    const s = DB.getSettings();
    document.getElementById("ads-enabled-toggle").checked = s.adsEnabled !== false;
  }
  document.getElementById("ads-enabled-toggle").addEventListener("change", (e) => {
    const s = DB.getSettings();
    s.adsEnabled = e.target.checked;
    DB.saveSettings(s);
    DB.logAdmin(`${e.target.checked ? "Enabled" : "Disabled"} site ads`);
    toast("Ad settings saved", "success");
  });

  /* ---------------- Premium settings ---------------- */
  function renderPremiumSettings() {
    const users = Object.entries(DB.getUsers()).filter(([, u]) => u.isPremium);
    document.getElementById("premium-users-list").innerHTML = users.length
      ? users.map(([, u]) => `<div class="purchase-row"><span>${escapeHTML(u.username)}</span><span>${u.premiumPlan}</span></div>`).join("")
      : `<div class="empty-state"><p>No premium subscribers yet.</p></div>`;
  }

  /* ---------------- Payments (free UPI manual verification) ---------------- */
  function renderPayments() {
    const s = DB.getSettings();
    document.getElementById("upi-vpa-input").value = s.upiVpa || "";
    document.getElementById("upi-payee-input").value = s.upiPayeeName || "";

    const payments = DB.getPayments();
    const pending = payments.filter(p => p.status === "pending");
    const decided = payments.filter(p => p.status !== "pending");

    document.getElementById("payments-pending-body").innerHTML = pending.length
      ? pending.map(p => `
        <tr>
          <td>${escapeHTML(p.username)}<br><span style="color:var(--ink-faint);font-size:11px;">${escapeHTML(p.email || "")}</span></td>
          <td>${escapeHTML(p.label)}</td>
          <td>₹${Number(p.amount).toFixed(2)}</td>
          <td style="font-family:monospace;">${escapeHTML(p.utr)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-primary btn-sm" data-approve="${p.id}">Approve</button>
              <button class="btn btn-danger btn-sm" data-reject="${p.id}">Reject</button>
            </div>
          </td>
        </tr>`).join("")
      : `<tr><td colspan="5"><div class="empty-state"><p>No payments waiting for review.</p></div></td></tr>`;

    document.getElementById("payments-history-body").innerHTML = decided.length
      ? decided.slice(0, 50).map(p => `
        <tr>
          <td>${escapeHTML(p.username)}</td>
          <td>${escapeHTML(p.label)}</td>
          <td>₹${Number(p.amount).toFixed(2)}</td>
          <td style="color:${p.status === "approved" ? "var(--success)" : "var(--danger)"};text-transform:capitalize;">${p.status}</td>
          <td>${new Date(p.decidedAt || p.requestedAt).toLocaleDateString()}</td>
        </tr>`).join("")
      : `<tr><td colspan="5"><div class="empty-state"><p>No decided payments yet.</p></div></td></tr>`;

    document.querySelectorAll("[data-approve]").forEach(btn => btn.addEventListener("click", () => {
      if (!confirm("Approve this payment and unlock it for the user?")) return;
      DB.approvePayment(btn.dataset.approve);
      toast("Payment approved and unlocked", "success");
      renderPayments(); renderDashboard(); renderPremiumSettings();
    }));
    document.querySelectorAll("[data-reject]").forEach(btn => btn.addEventListener("click", () => {
      const reason = prompt("Reason for rejecting (shown to the user):", "Could not match this UTR to a received payment.");
      if (reason === null) return;
      DB.rejectPayment(btn.dataset.reject, reason);
      toast("Payment rejected", "info");
      renderPayments();
    }));
  }

  document.getElementById("save-upi-btn").addEventListener("click", () => {
    const s = DB.getSettings();
    s.upiVpa = document.getElementById("upi-vpa-input").value.trim() || "yourupi@bank";
    s.upiPayeeName = document.getElementById("upi-payee-input").value.trim() || "AniLoka";
    DB.saveSettings(s);
    DB.logAdmin("Updated UPI payment settings");
    toast("UPI settings saved", "success");
  });

  /* ---------------- Homepage / featured ---------------- */
  function renderHomepageSettings() {
    const all = DB.getAllManga();
    const s = DB.getSettings();
    const sel = document.getElementById("featured-select");
    sel.innerHTML = all.map(m => `<option value="${m.id}" ${s.featuredIds?.[0] === m.id ? "selected" : ""}>${m.title}</option>`).join("")
      || `<option value="">No manga yet</option>`;
  }
  document.getElementById("save-featured-btn").addEventListener("click", () => {
    const s = DB.getSettings();
    s.featuredIds = [document.getElementById("featured-select").value];
    DB.saveSettings(s);
    DB.logAdmin("Updated homepage featured manga");
    toast("Featured manga updated", "success");
  });

  /* ---------------- Site Settings (maintenance mode + premium pricing) ---------------- */
  function renderSiteSettings() {
    const s = DB.getSettings();
    document.getElementById("maintenance-toggle").checked = !!s.maintenanceMode;
    document.getElementById("price-weekly").value = s.premiumPrices?.weekly ?? 2.99;
    document.getElementById("price-monthly").value = s.premiumPrices?.monthly ?? 8.99;
    document.getElementById("price-yearly").value = s.premiumPrices?.yearly ?? 69.99;
  }

  document.getElementById("maintenance-toggle").addEventListener("change", (e) => {
    const s = DB.getSettings();
    s.maintenanceMode = e.target.checked;
    DB.saveSettings(s);
    DB.logAdmin(`${e.target.checked ? "Enabled" : "Disabled"} maintenance mode`);
    toast(e.target.checked ? "Maintenance mode is ON — visitors will see the maintenance screen." : "Maintenance mode is OFF.", "success");
  });

  document.getElementById("save-prices-btn").addEventListener("click", () => {
    const s = DB.getSettings();
    s.premiumPrices = {
      weekly: parseFloat(document.getElementById("price-weekly").value) || 0,
      monthly: parseFloat(document.getElementById("price-monthly").value) || 0,
      yearly: parseFloat(document.getElementById("price-yearly").value) || 0
    };
    DB.saveSettings(s);
    DB.logAdmin("Updated premium plan prices");
    toast("Premium prices saved", "success");
  });

  /* All setup above is done — safe to render now. */
  renderAll();
}
