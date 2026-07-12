/* =========================================================
   APP LOGGER
   -----------------------------------------------------------
   Writes timestamped logs to console and to logs/YYYY-MM-DD.log.
   Kept dependency-free on purpose. HTTP access logs are handled
   separately by morgan in server.js — this is for app-level
   events (server start, admin actions, payment verification,
   errors) that you'll want a persistent trail of.
   ========================================================= */
const fs = require("fs");
const path = require("path");
const config = require("../config/env");

if (!fs.existsSync(config.LOG_DIR)) fs.mkdirSync(config.LOG_DIR, { recursive: true });

function fileFor(date = new Date()) {
  return path.join(config.LOG_DIR, `${date.toISOString().slice(0, 10)}.log`);
}

function write(level, message, meta) {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${meta ? " " + JSON.stringify(meta) : ""}`;
  if (level === "error") console.error(line); else console.log(line);
  try { fs.appendFileSync(fileFor(), line + "\n"); } catch (e) { /* disk full / read-only — don't crash the app over logging */ }
}

module.exports = {
  info: (msg, meta) => write("info", msg, meta),
  warn: (msg, meta) => write("warn", msg, meta),
  error: (msg, meta) => write("error", msg, meta),
};
