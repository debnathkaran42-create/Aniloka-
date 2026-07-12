const { verifyToken } = require("../utils/jwt");
const { users } = require("../db");

/** Reads the JWT from the httpOnly cookie, loads the user, attaches req.user. 401s if missing/invalid. */
function requireAuth(req, res, next) {
  const token = req.cookies?.aniloka_token;
  if (!token) return res.status(401).json({ error: "Not logged in." });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Session expired. Please log in again." });

  const user = users.findById(payload.sub);
  if (!user) return res.status(401).json({ error: "Account not found." });

  req.user = user;
  next();
}

/** Use after requireAuth. 403s anyone whose role isn't admin — this is REAL server-side
    protection, unlike a client-side password check a normal user could bypass by reading the JS. */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access only." });
  }
  next();
}

/** Optional auth: attaches req.user if a valid session exists, but never blocks the request. */
function optionalAuth(req, res, next) {
  const token = req.cookies?.aniloka_token;
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = users.findById(payload.sub) || null;
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
