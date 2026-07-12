/* =========================================================
   DATABASE BOOTSTRAP
   -----------------------------------------------------------
   Opens (or creates) every collection AniLoka needs, with the
   fields indexed for fast lookup. This is the single source
   of truth other modules import as `db`.
   ========================================================= */
const { AnilokaDB } = require("./AnilokaDB");
const config = require("../config/env");
const { hashPassword } = require("../utils/password");
const logger = require("../utils/logger");

const db = new AnilokaDB(config.DATA_DIR);

// --- Collections & their indexed fields ---
const users = db.collection("users", ["email", "role"]);
const manga = db.collection("manga", ["status"]);
const chapters = db.collection("chapters", ["mangaId"]);
const premium = db.collection("premium", ["userId", "status"]);
const bookmarks = db.collection("bookmarks", ["userId", "mangaId"]);
const history = db.collection("history", ["userId", "mangaId"]);
const transactions = db.collection("transactions", ["userId", "paymentStatus"]);
const notifications = db.collection("notifications", ["userId"]);
const passwordResets = db.collection("password_resets", ["userId", "token"]);

/** Creates the first admin account from .env if no admin exists yet. Safe to call on every boot. */
async function ensureAdminAccount() {
  const existingAdmin = users.findManyBy("role", "admin")[0];
  if (existingAdmin) return;

  const passwordHash = await hashPassword(config.ADMIN_PASSWORD);
  users.insert({
    username: "Admin",
    email: config.ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: "admin",
    isPremium: false,
    joinDate: new Date().toISOString(),
    lastLogin: null,
  });
  logger.info(`Admin account created: ${config.ADMIN_EMAIL} (change ADMIN_PASSWORD in .env if this is a fresh install)`);
}

module.exports = {
  db,
  users, manga, chapters, premium, bookmarks, history, transactions, notifications, passwordResets,
  ensureAdminAccount,
};
