/* =========================================================
   ANILOKA — BACKEND API CLIENT
   -----------------------------------------------------------
   Talks to the real Node/Express backend (see /aniloka-backend).
   Set BACKEND_URL below once you've deployed it — until then,
   API.isConfigured() returns false and every page keeps using
   the local-only fallback (same pattern as Razorpay/AdSense).
   ========================================================= */

const BACKEND_URL = "https://YOUR-BACKEND-URL.example.com"; // e.g. https://aniloka-api.onrender.com

function backendConfigured() {
  return typeof BACKEND_URL === "string" && BACKEND_URL && !BACKEND_URL.includes("YOUR-BACKEND-URL");
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

async function apiRequest(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrf = getCookie("aniloka_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(BACKEND_URL + path, {
    method,
    headers,
    credentials: "include", // send/receive the httpOnly auth cookie
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

const API = {
  isConfigured: backendConfigured,

  // ---- Auth ----
  signup: (username, email, password) => apiRequest("/api/auth/signup", { method: "POST", body: { username, email, password } }),
  login: (email, password) => apiRequest("/api/auth/login", { method: "POST", body: { email, password } }),
  logout: () => apiRequest("/api/auth/logout", { method: "POST" }),
  me: () => apiRequest("/api/auth/me"),
  forgotPassword: (email) => apiRequest("/api/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, newPassword) => apiRequest("/api/auth/reset-password", { method: "POST", body: { token, newPassword } }),

  // ---- Manga ----
  listManga: (params = {}) => apiRequest("/api/manga?" + new URLSearchParams(params)),
  getManga: (id) => apiRequest(`/api/manga/${id}`),
  createManga: (data) => apiRequest("/api/manga", { method: "POST", body: data }),
  updateManga: (id, data) => apiRequest(`/api/manga/${id}`, { method: "PUT", body: data }),
  deleteManga: (id) => apiRequest(`/api/manga/${id}`, { method: "DELETE" }),

  // ---- Chapters ----
  getChapter: (id) => apiRequest(`/api/chapters/${id}`),
  createChapter: (mangaId, data) => apiRequest(`/api/chapters/manga/${mangaId}`, { method: "POST", body: data }),
  updateChapter: (id, data) => apiRequest(`/api/chapters/${id}`, { method: "PUT", body: data }),
  deleteChapter: (id) => apiRequest(`/api/chapters/${id}`, { method: "DELETE" }),

  // ---- Premium & Payments ----
  listPlans: () => apiRequest("/api/premium/plans"),
  myPremiumStatus: () => apiRequest("/api/premium/status"),
  createTransaction: (data) => apiRequest("/api/transactions", { method: "POST", body: data }),
  submitUtr: (transactionId, utr) => apiRequest(`/api/transactions/${transactionId}/submit-utr`, { method: "POST", body: { utr } }),
  myTransactions: () => apiRequest("/api/transactions/mine"),

  // ---- Bookmarks & History ----
  listBookmarks: () => apiRequest("/api/bookmarks"),
  addBookmark: (mangaId, chapterId) => apiRequest("/api/bookmarks", { method: "POST", body: { mangaId, chapterId } }),
  removeBookmark: (id) => apiRequest(`/api/bookmarks/${id}`, { method: "DELETE" }),
  listHistory: () => apiRequest("/api/history"),
  saveProgress: (mangaId, lastChapterId, progress) => apiRequest("/api/history", { method: "POST", body: { mangaId, lastChapterId, progress } }),

  // ---- Notifications ----
  listNotifications: () => apiRequest("/api/notifications"),
  markNotificationRead: (id) => apiRequest(`/api/notifications/${id}/read`, { method: "POST" }),

  // ---- Admin ----
  adminDashboard: () => apiRequest("/api/admin/dashboard"),
  adminListUsers: () => apiRequest("/api/admin/users"),
  adminSetUserRole: (id, role) => apiRequest(`/api/admin/users/${id}/role`, { method: "PUT", body: { role } }),
  adminGrantPremium: (id, plan, days) => apiRequest(`/api/admin/users/${id}/grant-premium`, { method: "POST", body: { plan, days } }),
  adminRevokePremium: (id) => apiRequest(`/api/admin/users/${id}/revoke-premium`, { method: "POST" }),
  adminListTransactions: (status) => apiRequest("/api/admin/transactions" + (status ? `?status=${status}` : "")),
  adminVerifyTransaction: (id) => apiRequest(`/api/admin/transactions/${id}/verify`, { method: "POST" }),
  adminRejectTransaction: (id, reason) => apiRequest(`/api/admin/transactions/${id}/reject`, { method: "POST", body: { reason } }),
  adminBroadcast: (message) => apiRequest("/api/notifications/broadcast", { method: "POST", body: { message } }),

  // ---- Uploads (admin) ----
  async uploadCover(file) {
    const fd = new FormData(); fd.append("image", file);
    return apiRequest("/api/upload/cover", { method: "POST", body: fd, isFormData: true });
  },
  async uploadBanner(file) {
    const fd = new FormData(); fd.append("image", file);
    return apiRequest("/api/upload/banner", { method: "POST", body: fd, isFormData: true });
  },
  async uploadPages(files) {
    const fd = new FormData();
    [...files].forEach(f => fd.append("images", f));
    return apiRequest("/api/upload/pages", { method: "POST", body: fd, isFormData: true });
  },
};
