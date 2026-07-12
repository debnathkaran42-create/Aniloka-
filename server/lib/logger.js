/* =========================================================
   ANILOKA — LOGGER
   ========================================================= */
const fs = require("node:fs");
const path = require("node:path");

const LOG_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, "app.log");

function writeLine(line) {
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch (e) { /* best-effort, never crash on log failure */ }
}

function requestLogger(req, res, next) {
  const start = Date.now();
  const finish = () => {
    const ms = Date.now() - start;
    writeLine(`[${new Date().toISOString()}] ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`);
  };
  res.on("finish", finish);
  return next();
}

function logError(err, req) {
  const line = `[${new Date().toISOString()}] ERROR ${req ? req.method + " " + req.url : ""} :: ${err.stack || err.message}`;
  writeLine(line);
}

module.exports = { requestLogger, logError, writeLine };
