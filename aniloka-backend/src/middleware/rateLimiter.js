const rateLimit = require("express-rate-limit");
const config = require("../config/env");

/** Strict limiter for login/signup: 10 attempts per 15 minutes per IP. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

/** General API limiter — generous, just to blunt scraping/abuse. */
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down a little." },
});

module.exports = { authLimiter, apiLimiter };
