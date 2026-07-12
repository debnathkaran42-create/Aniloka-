/* =========================================================
   ANILOKA — SHARED RUNTIME
   Loaded on every page after data.js / auth.js
   ========================================================= */

/* ---------- Maintenance mode gate -----------------------
   Runs immediately when main.js loads. Admin panel and the
   maintenance page itself are exempt so an admin can always
   get in to switch it back off. ---------------------------- */
(function maintenanceGate() {
  const page = window.location.pathname.split("/").pop();
  if (page === "admin.html" || page === "maintenance.html") return;
  const settings = DB.getSettings();
  if (settings.maintenanceMode) window.location.href = "maintenance.html";
})();

/* ---------- Toasts ---------- */
function toast(message, type = "info") {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; }, 2600);
  setTimeout(() => el.remove(), 2950);
}

/* ---------- Button ripple ---------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn, .icon-btn, .manga-card");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement("span");
  const size = Math.max(rect.width, rect.height);
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
  ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
  if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
  btn.style.overflow = btn.style.overflow || "hidden";
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

/* ---------- Mobile nav ---------- */
function initMobileNav() {
  const hamburger = document.querySelector(".hamburger");
  const nav = document.querySelector(".mobile-nav");
  if (!hamburger || !nav) return;
  hamburger.addEventListener("click", () => nav.classList.add("open"));
  nav.querySelector(".close-mobile")?.addEventListener("click", () => nav.classList.remove("open"));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
}

/* ---------- Page loader ---------- */
function hidePageLoader() {
  const l = document.getElementById("page-loader");
  if (l) setTimeout(() => l.classList.add("done"), 250);
}

/* ---------- Premium theme ---------- */
function applyPremiumTheme() {
  const session = DB.getSession();
  const user = session ? DB.getUser(session.uid) : null;
  const isPremium = !!(user && user.isPremium);
  document.body.classList.toggle("premium-theme", isPremium);
  document.body.classList.toggle("is-premium", isPremium);
  return isPremium;
}

/* ---------- Nav injection: active link + avatar/premium badge ---------- */
function initNav(activeKey) {
  document.querySelectorAll(`[data-nav]`).forEach(a => {
    a.classList.toggle("active", a.dataset.nav === activeKey);
  });

  const session = DB.getSession();
  const avatarBtns = document.querySelectorAll(".avatar-btn");
  if (session) {
    const user = DB.getUser(session.uid);
    const initial = (user?.avatarInitial || session.username?.charAt(0) || "U").toUpperCase();
    avatarBtns.forEach(b => { b.textContent = initial; b.title = user?.username || session.username; });
  } else {
    avatarBtns.forEach(b => { b.textContent = "?"; b.title = "Guest — click to log in"; b.onclick = () => location.href = "login.html"; });
  }

  applyPremiumTheme();
  initMobileNav();
}

/* ---------- Live search dropdown (topnav) ---------- */
function initTopnavSearch() {
  const input = document.querySelector(".topnav-search input");
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      window.location.href = `search.html?q=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

/* ---------- Manga card renderer (shared across home/search/library) ---------- */
function mangaCardHTML(m, opts = {}) {
  const progress = opts.progressPct != null
    ? `<div class="progress"><span style="width:${opts.progressPct}%"></span></div>` : "";
  const badge = opts.badge ? `<span class="badge ${opts.badgeClass || ""}">${opts.badge}</span>` : "";
  const isIDB = (m.cover || "").startsWith("idb://");
  const srcAttr = isIDB ? "" : `src="${m.cover}"`;
  const dataSrc = isIDB ? `data-src="${m.cover}"` : "";
  return `
  <a class="manga-card" href="manga-details.html?id=${m.id}">
    <div class="cover">
      ${badge}
      <img ${srcAttr} ${dataSrc} alt="${m.title}" loading="lazy"
           onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')">
      <div class="cover-placeholder hidden">${m.title}</div>
    </div>
    <div class="info">
      <div class="title">${m.title}</div>
      <div class="meta"><span>${m.status}</span><span>${icon("star",11)} ${m.rating}</span></div>
      ${progress}
    </div>
  </a>`;
}

/* Resolves any img[data-src="idb://..."] inside a container into real object URLs.
   Call this after injecting mangaCardHTML() output (or any idb-referencing img) into the DOM. */
function hydrateImages(container) {
  (container || document).querySelectorAll("img[data-src]").forEach(img => {
    resolveImageSrc(img.dataset.src, img);
  });
}

function renderRail(containerId, list, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!list.length) {
    el.parentElement.classList.add("hidden");
    return;
  }
  el.innerHTML = list.map(m => mangaCardHTML(m, opts)).join("");
  hydrateImages(el);
}

/* ---------- Ad slots ---------- */
function renderAdSlot(type = "banner") {
  return `<div class="ad-slot ad-${type}"></div>`;
}

/* ---------- Misc helpers ---------- */
function qs(param) { return new URLSearchParams(window.location.search).get(param); }
function escapeHTML(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
