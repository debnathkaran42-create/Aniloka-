/* =========================================================
   ANILOKA — AUTH MIDDLEWARE
   ========================================================= */
const { verifyToken } = require("./crypto");
const { fail } = require("./respond");

function getSecret() { return process.env.SESSION_SECRET || "dev-insecure-secret-change-me"; }

function extractToken(req) {
  const header = req.headers["authorization"] || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

/** Attaches req.user if a valid token is present. Never blocks the request. */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token, getSecret());
    if (payload) req.user = payload;
  }
  return next();
}

/** Blocks the request with 401 unless a valid token is present. */
function requireAuth(req, res, next) {
  const token = extractToken(req);
  const payload = token && verifyToken(token, getSecret());
  if (!payload) return fail(res, 401, "Please log in to continue.");
  req.user = payload;
  return next();
}

/** Blocks unless the authenticated user has role 'admin'. */
function requireAdmin(req, res, next) {
  const token = extractToken(req);
  const payload = token && verifyToken(token, getSecret());
  if (!payload) return fail(res, 401, "Please log in to continue.");
  if (payload.role !== "admin") return fail(res, 403, "Admin access required.");
  req.user = payload;
  return next();
}

module.exports = { optionalAuth, requireAuth, requireAdmin, getSecret };
