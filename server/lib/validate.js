/* =========================================================
   ANILOKA — INPUT VALIDATION
   ========================================================= */
const { ApiError } = require("./respond");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isString(v) { return typeof v === "string"; }
function isNonEmptyString(v) { return isString(v) && v.trim().length > 0; }

function required(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === "");
  if (missing.length) throw new ApiError(400, `Missing required field(s): ${missing.join(", ")}`);
}

function validateEmail(email) {
  if (!isNonEmptyString(email) || !EMAIL_RE.test(email.trim())) {
    throw new ApiError(400, "Enter a valid email address.");
  }
}

function validatePassword(password) {
  if (!isString(password) || password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters.");
  }
}

function validateUsername(username) {
  if (!isNonEmptyString(username) || username.trim().length < 3) {
    throw new ApiError(400, "Username must be at least 3 characters.");
  }
}

function sanitizeText(v, maxLen = 5000) {
  if (v == null) return "";
  return String(v).slice(0, maxLen);
}

function clampNumber(v, min, max, fallback) {
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

module.exports = { required, validateEmail, validatePassword, validateUsername, sanitizeText, clampNumber, isNonEmptyString };
