/* =========================================================
   ANILOKA — DATA LAYER
   -----------------------------------------------------------
   Everything here reads/writes through the DB object so that
   swapping localStorage for Firestore later only means
   rewriting the methods inside DB — no page code changes.
   ========================================================= */

/* ---------------------------------------------------------
   GENRES — placeholder list. Replace with your real list in
   data/genres.json (loaded below) or edit the array directly.
   --------------------------------------------------------- */
const GENRES = [
  "Genre 1", "Genre 2", "Genre 3", "Genre 4",
  "Genre 5", "Genre 6", "Genre 7", "Genre 8"
];

/* ---------------------------------------------------------
   MANGA CATALOG — placeholder entries "Manga 1" / "Manga 2".
   Swap the `title`, `cover`, `banner`, and chapter `image`
   paths once real assets are placed in /images/manga/...
   Admin panel edits are merged on top of this base list via
   localStorage, so this file stays your "seed" data.
   --------------------------------------------------------- */
const SEED_MANGA = [
  {
    id: "manga-1",
    title: "Manga 1",
    author: "Author Name",
    artist: "Artist Name",
    publisher: "Publisher Name",
    year: 2024,
    status: "Ongoing",
    rating: 4.5,
    genres: ["Genre 1", "Genre 2", "Genre 3"],
    description: "Placeholder synopsis for Manga 1. Replace this description from the Admin Panel once real manga data is ready.",
    cover: "images/manga/covers/manga-1.jpg",
    banner: "images/manga/banners/manga-1.jpg",
    featured: true,
    trending: true,
    popular: true,
    chapters: [
      { id: "ch-1", number: 1, title: "Chapter 1", pages: 0, date: "2024-01-05", paid: false, price: 0 },
      { id: "ch-2", number: 2, title: "Chapter 2", pages: 0, date: "2024-01-12", paid: false, price: 0 },
      { id: "ch-3", number: 3, title: "Chapter 3", pages: 0, date: "2024-01-19", paid: true, price: 0.99 }
    ]
  },
  {
    id: "manga-2",
    title: "Manga 2",
    author: "Author Name",
    artist: "Artist Name",
    publisher: "Publisher Name",
    year: 2023,
    status: "Completed",
    rating: 4.2,
    genres: ["Genre 4", "Genre 5"],
    description: "Placeholder synopsis for Manga 2. Replace this description from the Admin Panel once real manga data is ready.",
    cover: "images/manga/covers/manga-2.jpg",
    banner: "images/manga/banners/manga-2.jpg",
    featured: false,
    trending: false,
    popular: true,
    chapters: [
      { id: "ch-1", number: 1, title: "Chapter 1", pages: 0, date: "2023-11-01", paid: false, price: 0 },
      { id: "ch-2", number: 2, title: "Chapter 2", pages: 0, date: "2023-11-08", paid: false, price: 0 }
    ]
  }
];

/* ---------------------------------------------------------
   DB — thin wrapper around localStorage.
   Swap-to-Firestore note: keep method names identical and
   replace bodies with firebase.firestore() calls later.
   --------------------------------------------------------- */
const DB = {
  KEYS: {
    MANGA: "aniloka_manga",
    USERS: "aniloka_users",
    SESSION: "aniloka_session",
    LIBRARY: "aniloka_library_",     // + username
    PROGRESS: "aniloka_progress_",   // + username
    SETTINGS: "aniloka_settings",
    ADMIN_LOG: "aniloka_admin_log",
    PAYMENTS: "aniloka_payments"
  },

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  /* ----- Manga catalog ----- */
  init() {
    if (!localStorage.getItem(this.KEYS.MANGA)) {
      this._write(this.KEYS.MANGA, SEED_MANGA);
    }
    if (!localStorage.getItem(this.KEYS.SETTINGS)) {
      this._write(this.KEYS.SETTINGS, {
        siteTitle: "AniLoka",
        featuredIds: ["manga-1"],
        homepageSections: ["latest", "trending", "popular", "newChapters", "recommended", "recentlyUpdated"],
        adsEnabled: true,
        maintenanceMode: false,
        premiumPrices: { weekly: 2.99, monthly: 8.99, yearly: 69.99 },
        upiVpa: "yourupi@bank",
        upiPayeeName: "AniLoka"
      });
    } else {
      // Backfill new fields for sites that already had settings saved before this update.
      const s = this._read(this.KEYS.SETTINGS, {});
      let changed = false;
      if (s.maintenanceMode === undefined) { s.maintenanceMode = false; changed = true; }
      if (!s.premiumPrices) { s.premiumPrices = { weekly: 2.99, monthly: 8.99, yearly: 69.99 }; changed = true; }
      if (!s.upiVpa) { s.upiVpa = "yourupi@bank"; changed = true; }
      if (!s.upiPayeeName) { s.upiPayeeName = "AniLoka"; changed = true; }
      if (changed) this._write(this.KEYS.SETTINGS, s);
    }
  },
  getAllManga() { return this._read(this.KEYS.MANGA, []); },
  getManga(id) { return this.getAllManga().find(m => m.id === id) || null; },
  saveManga(manga) {
    const all = this.getAllManga();
    const idx = all.findIndex(m => m.id === manga.id);
    if (idx >= 0) all[idx] = manga; else all.push(manga);
    this._write(this.KEYS.MANGA, all);
  },
  deleteManga(id) {
    this._write(this.KEYS.MANGA, this.getAllManga().filter(m => m.id !== id));
  },
  searchManga({ q = "", genre = "", author = "", publisher = "", year = "" } = {}) {
    q = q.trim().toLowerCase();
    return this.getAllManga().filter(m => {
      if (q && !m.title.toLowerCase().includes(q)) return false;
      if (genre && !m.genres.includes(genre)) return false;
      if (author && !m.author.toLowerCase().includes(author.toLowerCase())) return false;
      if (publisher && !m.publisher.toLowerCase().includes(publisher.toLowerCase())) return false;
      if (year && String(m.year) !== String(year)) return false;
      return true;
    });
  },

  /* ----- Settings ----- */
  getSettings() { return this._read(this.KEYS.SETTINGS, {}); },
  saveSettings(s) { this._write(this.KEYS.SETTINGS, s); },

  /* ----- Users (profile data only; auth identity comes from AUTH/local login) ----- */
  getUsers() { return this._read(this.KEYS.USERS, {}); },
  getUser(uid) { return this.getUsers()[uid] || null; },
  saveUser(uid, data) {
    const users = this.getUsers();
    users[uid] = { ...users[uid], ...data };
    this._write(this.KEYS.USERS, users);
    return users[uid];
  },

  /* ----- Session (currently logged-in local user) ----- */
  getSession() { return this._read(this.KEYS.SESSION, null); },
  setSession(user) { this._write(this.KEYS.SESSION, user); },
  clearSession() { localStorage.removeItem(this.KEYS.SESSION); },

  /* ----- Library: favorites / bookmarks / reading status / purchases ----- */
  getLibrary(uid) {
    const lib = this._read(this.KEYS.LIBRARY + uid, {
      favorites: [], reading: [], completed: [], planToRead: [], bookmarks: {}, purchasedChapters: {}
    });
    if (!lib.purchasedChapters) lib.purchasedChapters = {}; // backfill for older saved libraries
    return lib;
  },
  saveLibrary(uid, lib) { this._write(this.KEYS.LIBRARY + uid, lib); },
  toggleFavorite(uid, mangaId) {
    const lib = this.getLibrary(uid);
    const i = lib.favorites.indexOf(mangaId);
    if (i >= 0) lib.favorites.splice(i, 1); else lib.favorites.push(mangaId);
    this.saveLibrary(uid, lib);
    return lib;
  },
  setStatus(uid, mangaId, status) {
    const lib = this.getLibrary(uid);
    ["reading", "completed", "planToRead"].forEach(s => {
      lib[s] = lib[s].filter(id => id !== mangaId);
    });
    if (status) lib[status].push(mangaId);
    this.saveLibrary(uid, lib);
    return lib;
  },
  toggleBookmark(uid, mangaId, chapterId) {
    const lib = this.getLibrary(uid);
    lib.bookmarks[mangaId] = lib.bookmarks[mangaId] || [];
    const i = lib.bookmarks[mangaId].indexOf(chapterId);
    if (i >= 0) lib.bookmarks[mangaId].splice(i, 1); else lib.bookmarks[mangaId].push(chapterId);
    this.saveLibrary(uid, lib);
    return lib;
  },

  /* ----- Paid chapters: purchases + access check -----
     Premium members get every chapter automatically. Everyone
     else can still unlock individual paid chapters one at a time. */
  hasPurchasedChapter(uid, mangaId, chapterId) {
    const lib = this.getLibrary(uid);
    return (lib.purchasedChapters[mangaId] || []).includes(chapterId);
  },
  purchaseChapter(uid, mangaId, chapterId) {
    const lib = this.getLibrary(uid);
    lib.purchasedChapters[mangaId] = lib.purchasedChapters[mangaId] || [];
    if (!lib.purchasedChapters[mangaId].includes(chapterId)) lib.purchasedChapters[mangaId].push(chapterId);
    this.saveLibrary(uid, lib);
    return lib;
  },
  canAccessChapter(uid, mangaId, chapter) {
    if (!chapter.paid) return true;
    const user = this.getUser(uid);
    if (user && user.isPremium) return true;
    return this.hasPurchasedChapter(uid, mangaId, chapter.id);
  },

  /* ----- Reading progress (auto-saved every 10s from reader.js) ----- */
  getProgress(uid) { return this._read(this.KEYS.PROGRESS + uid, {}); },
  saveProgress(uid, mangaId, chapterId, page) {
    const p = this.getProgress(uid);
    p[mangaId] = { chapterId, page, updatedAt: Date.now() };
    this._write(this.KEYS.PROGRESS + uid, p);
  },

  /* ----- Admin activity log ----- */
  logAdmin(action) {
    const log = this._read(this.KEYS.ADMIN_LOG, []);
    log.unshift({ action, at: new Date().toISOString() });
    this._write(this.KEYS.ADMIN_LOG, log.slice(0, 200));
  },
  getAdminLog() { return this._read(this.KEYS.ADMIN_LOG, []); },

  /* -----------------------------------------------------------
     UPI PAYMENT REQUESTS (free, manually verified by admin)
     Each request: { id, uid, username, email, type: 'premium'|'chapter',
       plan, mangaId, chapterId, label, amount, utr, status, requestedAt, decidedAt }
     status: 'pending' -> 'approved' | 'rejected'
     ----------------------------------------------------------- */
  createPaymentRequest(req) {
    const payments = this._read(this.KEYS.PAYMENTS, []);
    const request = {
      id: "pay_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      status: "pending",
      requestedAt: new Date().toISOString(),
      ...req
    };
    payments.unshift(request);
    this._write(this.KEYS.PAYMENTS, payments);
    return request;
  },
  getPayments() { return this._read(this.KEYS.PAYMENTS, []); },
  getUserPayments(uid) { return this.getPayments().filter(p => p.uid === uid); },
  getPayment(id) { return this.getPayments().find(p => p.id === id) || null; },

  /** Admin approves a pending UPI payment: marks it approved AND immediately
      unlocks whatever was purchased (premium plan or a single paid chapter). */
  approvePayment(id) {
    const payments = this.getPayments();
    const idx = payments.findIndex(p => p.id === id);
    if (idx < 0) return null;
    const req = payments[idx];
    if (req.status !== "pending") return req;

    if (req.type === "premium") {
      this.saveUser(req.uid, { isPremium: true, premiumPlan: req.plan });
      const purchases = this._read("aniloka_purchases_" + req.uid, []);
      purchases.unshift({ plan: req.label, date: new Date().toLocaleDateString(), upi: true, utr: req.utr });
      this._write("aniloka_purchases_" + req.uid, purchases);
    } else if (req.type === "chapter") {
      this.purchaseChapter(req.uid, req.mangaId, req.chapterId);
    }

    req.status = "approved";
    req.decidedAt = new Date().toISOString();
    payments[idx] = req;
    this._write(this.KEYS.PAYMENTS, payments);
    this.logAdmin(`Approved UPI payment ${req.id} (${req.label}) for ${req.username}`);
    return req;
  },

  rejectPayment(id, reason) {
    const payments = this.getPayments();
    const idx = payments.findIndex(p => p.id === id);
    if (idx < 0) return null;
    const req = payments[idx];
    req.status = "rejected";
    req.decidedAt = new Date().toISOString();
    req.rejectReason = reason || "UTR could not be verified.";
    payments[idx] = req;
    this._write(this.KEYS.PAYMENTS, payments);
    this.logAdmin(`Rejected UPI payment ${req.id} (${req.label}) for ${req.username}`);
    return req;
  }
};

DB.init();
