/* =========================================================
   ENVIRONMENT CONFIG
   Loads .env and exposes typed config with safe defaults.
   Copy .env.example to .env and fill in real values before
   running in production — never commit .env to git.
   ========================================================= */
require("dotenv").config();
const path = require("path");

function required(name, fallback) {
  const val = process.env[name];
  if (val === undefined || val === "") {
    if (fallback !== undefined) return fallback;
    console.warn(`[config] Warning: ${name} is not set in .env`);
  }
  return val;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),

  JWT_SECRET: required("JWT_SECRET", "change-this-dev-secret-before-deploying"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_SECURE: process.env.NODE_ENV === "production",

  CORS_ORIGIN: process.env.CORS_ORIGIN || "*", // set to your real frontend URL in production

  ADMIN_EMAIL: required("ADMIN_EMAIL", "aniloka@admin.com"),
  ADMIN_PASSWORD: required("ADMIN_PASSWORD", "KarnaTejas67"),

  UPI_VPA: process.env.UPI_VPA || "yourupi@bank",
  UPI_PAYEE_NAME: process.env.UPI_PAYEE_NAME || "AniLoka",

  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, "../../data"),
  UPLOADS_DIR: process.env.UPLOADS_DIR || path.join(__dirname, "../../uploads"),
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, "../../logs"),

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
};
