const { users, passwordResets } = require("../db");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { newCsrfToken } = require("../middleware/csrf");
const { newId } = require("../db/AnilokaDB");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");
const config = require("../config/env");
const logger = require("../utils/logger");
const crypto = require("crypto");

function publicUser(u) {
  // Never send passwordHash (or anything else internal) to the client.
  const { passwordHash, ...safe } = u;
  return safe;
}

function setAuthCookies(res, user) {
  const token = signToken({ sub: user.id, role: user.role });
  const csrfToken = newCsrfToken();

  res.cookie("aniloka_token", token, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie("aniloka_csrf", csrfToken, {
    httpOnly: false, // frontend JS must be able to read this one
    secure: config.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  if (users.findOneBy("email", normalizedEmail)) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);
  const user = users.insert({
    username: username.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "user",
    isPremium: false,
    joinDate: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  });

  setAuthCookies(res, user);
  logger.info("New signup", { userId: user.id, email: normalizedEmail });
  res.status(201).json({ user: publicUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const user = users.findOneBy("email", normalizedEmail);
  if (!user) throw new AppError("Incorrect email or password.", 401);

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new AppError("Incorrect email or password.", 401);

  users.update(user.id, { lastLogin: new Date().toISOString() });
  setAuthCookies(res, user);
  logger.info("Login", { userId: user.id });
  res.json({ user: publicUser(user) });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie("aniloka_token");
  res.clearCookie("aniloka_csrf");
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/** Generates a reset token valid for 1 hour. NOTE: this does not send a real email —
    hook up an email service (Resend, SendGrid, etc.) in production and email
    `resetUrl` instead of returning it in the response. */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.findOneBy("email", normalizedEmail);

  // Always respond the same way whether or not the account exists,
  // so an attacker can't use this endpoint to discover valid emails.
  if (!user) return res.json({ ok: true, message: "If that account exists, a reset link has been generated." });

  const token = crypto.randomBytes(24).toString("hex");
  passwordResets.insert({
    id: newId("rst"),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    used: false,
  });

  logger.info("Password reset requested", { userId: user.id });
  res.json({
    ok: true,
    message: "If that account exists, a reset link has been generated.",
    devNote: "No email service is configured yet — this token is returned here only for local testing.",
    resetToken: token,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const reset = passwordResets.find(r => r.token === token && !r.used)[0];

  if (!reset || new Date(reset.expiresAt) < new Date()) {
    throw new AppError("This reset link is invalid or has expired.", 400);
  }

  const passwordHash = await hashPassword(newPassword);
  users.update(reset.userId, { passwordHash });
  passwordResets.update(reset.id, { used: true });

  logger.info("Password reset completed", { userId: reset.userId });
  res.json({ ok: true, message: "Password updated. You can log in now." });
});

module.exports = { signup, login, logout, me, forgotPassword, resetPassword, publicUser };
