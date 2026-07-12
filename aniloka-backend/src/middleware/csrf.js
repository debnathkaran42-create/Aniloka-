/* =========================================================
   CSRF PROTECTION (double-submit cookie)
   -----------------------------------------------------------
   Because login uses an httpOnly cookie (safer against XSS token
   theft), state-changing requests need CSRF protection too, or a
   malicious site could trigger authenticated POSTs using the
   browser's auto-attached cookie.

   How it works:
   - On login/signup, we also set a *readable* cookie `aniloka_csrf`
     with a random token.
   - The frontend JS reads that cookie and sends it back as the
     `X-CSRF-Token` header on every POST/PUT/PATCH/DELETE.
   - This middleware rejects the request if the header doesn't
     match the cookie — a malicious third-party site can trigger
     the cookie to be sent automatically, but it cannot read the
     cookie's value to also set the matching header.
   ========================================================= */
const crypto = require("crypto");

function newCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

function verifyCsrf(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return next();

  const cookieToken = req.cookies?.aniloka_csrf;
  const headerToken = req.get("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF check failed. Please refresh and try again." });
  }
  next();
}

module.exports = { newCsrfToken, verifyCsrf };
