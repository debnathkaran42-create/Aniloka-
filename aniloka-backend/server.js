/* =========================================================
   ANILOKA BACKEND — SERVER ENTRY POINT
   ========================================================= */
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const config = require("./src/config/env");
const logger = require("./src/utils/logger");
const { ensureAdminAccount } = require("./src/db");
const { apiLimiter } = require("./src/middleware/rateLimiter");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

const app = express();

/* ---- Security headers ---- */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow images to be loaded by the frontend origin
}));

/* ---- CORS (frontend and backend are different origins) ---- */
app.use(cors({
  origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN.split(","),
  credentials: true, // required so the httpOnly auth cookie is sent/received
}));

/* ---- Body parsing & cookies ---- */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ---- HTTP access logging (separate from app-level logger.js) ---- */
const accessLogStream = fs.createWriteStream(path.join(config.LOG_DIR, "access.log"), { flags: "a" });
app.use(morgan("combined", { stream: accessLogStream }));
if (config.NODE_ENV !== "production") app.use(morgan("dev"));

/* ---- General rate limiting on all API routes ---- */
app.use("/api", apiLimiter);

/* ---- Static file serving for uploaded images ---- */
app.use("/uploads", express.static(config.UPLOADS_DIR));

/* ---- Health check (useful for uptime monitors / free-tier host pings) ---- */
app.get("/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

/* ---- Routes ---- */
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/manga", require("./src/routes/manga.routes"));
app.use("/api/chapters", require("./src/routes/chapters.routes"));
app.use("/api", require("./src/routes/premium.routes")); // /api/premium/*, /api/transactions/*, /api/admin/transactions/*
app.use("/api/bookmarks", require("./src/routes/bookmarks.routes"));
app.use("/api/history", require("./src/routes/history.routes"));
app.use("/api/notifications", require("./src/routes/notifications.routes"));
app.use("/api/admin", require("./src/routes/admin.routes"));
app.use("/api/upload", require("./src/routes/upload.routes"));

/* ---- 404 + error handling (must be last) ---- */
app.use(notFound);
app.use(errorHandler);

/* ---- Boot ---- */
ensureAdminAccount()
  .then(() => {
    app.listen(config.PORT, () => {
      logger.info(`AniLoka backend running on port ${config.PORT} (${config.NODE_ENV})`);
    });
  })
  .catch(err => {
    logger.error("Failed to start server", { error: err.message });
    process.exit(1);
  });

module.exports = app;
