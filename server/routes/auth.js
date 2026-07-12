/* =========================================================
   ANILOKA — AUTH ROUTES
   ========================================================= */
const { db } = require("../db/database");
const { hashPassword, verifyPassword, signToken, randomId } = require("../lib/crypto");
const { ok, created, fail, ApiError, readJSONBody } = require("../lib/respond");
const { required, validateEmail, validatePassword, validateUsername } = require("../lib/validate");
const { requireAuth, getSecret } = require("../lib/auth-middleware");
const { rateLimit } = require("../lib/ratelimit");

const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 8, keyFn: (req) => "login:" + (req.socket.remoteAddress || "") });

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id, username: row.username, email: row.email, role: row.role,
    isPremium: !!row.is_premium, premiumPlan: row.premium_plan, premiumExpiry: row.premium_expiry,
    joinDate: row.join_date, lastLogin: row.last_login,
  };
}

function register(router) {
  router.post("/api/auth/signup", async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["username", "email", "password"]);
    validateUsername(body.username);
    validateEmail(body.email);
    validatePassword(body.password);

    const email = body.email.trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) throw new ApiError(409, "An account with this email already exists.");

    const id = randomId("user");
    const passwordHash = hashPassword(body.password);
    db.prepare(`INSERT INTO users (id, username, email, password_hash, role) VALUES (?,?,?,?, 'user')`)
      .run(id, body.username.trim(), email, passwordHash);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    const token = signToken({ uid: id, role: "user" }, getSecret());
    created(res, { user: publicUser(user), token });
  });

  router.post("/api/auth/login", loginLimiter, async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["email", "password"]);
    const email = body.email.trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !verifyPassword(body.password, user.password_hash)) {
      throw new ApiError(401, "Incorrect email or password.");
    }
    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);
    const token = signToken({ uid: user.id, role: user.role }, getSecret());
    ok(res, { user: publicUser(user), token });
  });

  router.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = require("../lib/premium").refreshPremiumStatus(req.user.uid);
    if (!user) throw new ApiError(404, "User not found.");
    ok(res, { user: publicUser(user) });
  });

  router.post("/api/auth/forgot-password", async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["email"]);
    const email = body.email.trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    // Always respond the same way whether or not the account exists (avoids leaking which emails are registered)
    if (user) {
      const token = randomId("reset");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      db.prepare("INSERT INTO password_resets (token, user_id, expires_at) VALUES (?,?,?)").run(token, user.id, expiresAt);
      // NOTE: no email provider is configured, so the reset link is only logged server-side.
      // Plug in a real provider (SMTP / SendGrid / Resend / etc.) in production and email
      // `${APP_URL}/reset-password.html?token=${token}` to the user instead of logging it.
      require("../lib/logger").writeLine(`[password-reset] token for ${email}: ${token} (expires ${expiresAt})`);
    }
    ok(res, { message: "If that email is registered, a reset link has been generated. (No email service is configured yet — see server logs.)" });
  });

  router.post("/api/auth/reset-password", async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["token", "password"]);
    validatePassword(body.password);
    const reset = db.prepare("SELECT * FROM password_resets WHERE token = ?").get(body.token);
    if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
      throw new ApiError(400, "This reset link is invalid or has expired.");
    }
    const passwordHash = hashPassword(body.password);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, reset.user_id);
    db.prepare("UPDATE password_resets SET used = 1 WHERE token = ?").run(body.token);
    ok(res, { message: "Password updated. You can now log in." });
  });
}

module.exports = { register, publicUser };
