/* =========================================================
   ANILOKA — RATE LIMITER
   -----------------------------------------------------------
   Simple in-memory fixed-window limiter keyed by IP (+ optional
   extra key like email, for login-specific limiting). Good
   enough for a single-process deployment; swap for a Redis-
   backed limiter if you ever run multiple instances.
   ========================================================= */
const buckets = new Map(); // key -> { count, resetAt }

function rateLimit({ windowMs = 60000, max = 60, keyFn } = {}) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.socket.remoteAddress || "unknown");
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > max) {
      const { fail } = require("./respond");
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return fail(res, 429, `Too many requests. Try again in ${retryAfter}s.`);
    }
    return next();
  };
}

// periodic cleanup so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = { rateLimit };
