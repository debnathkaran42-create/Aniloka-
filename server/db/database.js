/* =========================================================
   ANILOKA — DATABASE (node:sqlite)
   -----------------------------------------------------------
   Real SQL database, zero external packages — uses Node's
   built-in sqlite module (stable from Node 22.5+, marked
   experimental but fully functional). File lives at
   server/data/aniloka.db and persists across restarts.
   ========================================================= */
const path = require("node:path");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "..", "data", "aniloka.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  is_premium INTEGER NOT NULL DEFAULT 0,
  premium_plan TEXT,
  premium_expiry TEXT,
  join_date TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS manga (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  genres TEXT NOT NULL DEFAULT '[]',
  author TEXT DEFAULT 'Unknown',
  artist TEXT DEFAULT 'Unknown',
  publisher TEXT DEFAULT 'Unknown',
  cover_image TEXT,
  banner_image TEXT,
  status TEXT NOT NULL DEFAULT 'Ongoing',
  release_year INTEGER,
  rating REAL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  trending INTEGER NOT NULL DEFAULT 0,
  popular INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
  chapter_number REAL NOT NULL,
  chapter_title TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',
  is_paid INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  upload_date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS premium_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, manga_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
  status TEXT DEFAULT NULL CHECK(status IN (NULL,'reading','completed','planToRead')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, manga_id)
);

CREATE TABLE IF NOT EXISTS reading_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
  last_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  page INTEGER DEFAULT 1,
  progress_pct REAL DEFAULT 0,
  last_read TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, manga_id)
);

CREATE TABLE IF NOT EXISTS chapter_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  price REAL DEFAULT 0,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('premium','chapter')),
  ref_id TEXT,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  utr TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT,
  verified_by TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
`);

// seed default premium plans if empty
const planCount = db.prepare("SELECT COUNT(*) AS c FROM premium_plans").get().c;
if (planCount === 0) {
  const ins = db.prepare("INSERT INTO premium_plans (id,name,duration_days,price,active) VALUES (?,?,?,?,1)");
  ins.run("plan_weekly", "Weekly", 7, 29);
  ins.run("plan_monthly", "Monthly", 30, 89);
  ins.run("plan_quarterly", "Quarterly", 90, 229);
  ins.run("plan_yearly", "Yearly", 365, 699);
}

// seed default settings if empty
const settingDefaults = {
  site_title: "AniLoka",
  maintenance_mode: "false",
  ads_enabled: "true",
  adsense_client_id: "",
  upi_vpa: "yourupi@bank",
  upi_payee_name: "AniLoka",
};
const getSetting = db.prepare("SELECT value FROM settings WHERE key = ?");
const setSetting = db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
for (const [k, v] of Object.entries(settingDefaults)) {
  if (!getSetting.get(k)) setSetting.run(k, v);
}

module.exports = { db };
