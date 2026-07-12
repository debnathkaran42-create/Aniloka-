/* =========================================================
   ANILOKA — LIBRARY ROUTES (bookmarks, favorites, history)
   ========================================================= */
const { db } = require("../db/database");
const { randomId } = require("../lib/crypto");
const { ok, ApiError, readJSONBody } = require("../lib/respond");
const { required, clampNumber } = require("../lib/validate");
const { requireAuth } = require("../lib/auth-middleware");
const { mangaRow } = require("./manga");

function register(router) {
  /* ---------- Favorites + reading status (reading/completed/planToRead) ---------- */
  router.get("/api/library/favorites", requireAuth, async (req, res) => {
    const rows = db.prepare(`
      SELECT m.*, f.status AS lib_status FROM favorites f
      JOIN manga m ON m.id = f.manga_id WHERE f.user_id = ? ORDER BY f.created_at DESC`).all(req.user.uid);
    ok(res, { manga: rows.map(r => ({ ...mangaRow(r), libraryStatus: r.lib_status })) });
  });

  router.post("/api/library/favorites/toggle", requireAuth, async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["mangaId"]);
    const existing = db.prepare("SELECT id FROM favorites WHERE user_id = ? AND manga_id = ?").get(req.user.uid, body.mangaId);
    if (existing) {
      db.prepare("DELETE FROM favorites WHERE id = ?").run(existing.id);
      return ok(res, { favorited: false });
    }
    db.prepare("INSERT INTO favorites (id, user_id, manga_id) VALUES (?,?,?)").run(randomId("fav"), req.user.uid, body.mangaId);
    ok(res, { favorited: true });
  });

  router.post("/api/library/status", requireAuth, async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["mangaId"]);
    const status = ["reading", "completed", "planToRead", null].includes(body.status) ? body.status : null;
    const existing = db.prepare("SELECT id FROM favorites WHERE user_id = ? AND manga_id = ?").get(req.user.uid, body.mangaId);
    if (existing) {
      db.prepare("UPDATE favorites SET status = ? WHERE id = ?").run(status, existing.id);
    } else {
      db.prepare("INSERT INTO favorites (id, user_id, manga_id, status) VALUES (?,?,?,?)").run(randomId("fav"), req.user.uid, body.mangaId, status);
    }
    ok(res, { status });
  });

  /* ---------- Bookmarks (specific chapters) ---------- */
  router.get("/api/library/bookmarks", requireAuth, async (req, res) => {
    const rows = db.prepare(`
      SELECT b.*, m.title AS manga_title, c.chapter_title, c.chapter_number FROM bookmarks b
      JOIN manga m ON m.id = b.manga_id LEFT JOIN chapters c ON c.id = b.chapter_id
      WHERE b.user_id = ? ORDER BY b.created_at DESC`).all(req.user.uid);
    ok(res, {
      bookmarks: rows.map(r => ({
        mangaId: r.manga_id, mangaTitle: r.manga_title, chapterId: r.chapter_id,
        chapterTitle: r.chapter_title, chapterNumber: r.chapter_number, createdAt: r.created_at,
      }))
    });
  });

  router.post("/api/library/bookmarks/toggle", requireAuth, async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["mangaId", "chapterId"]);
    const existing = db.prepare("SELECT id FROM bookmarks WHERE user_id = ? AND manga_id = ? AND chapter_id = ?")
      .get(req.user.uid, body.mangaId, body.chapterId);
    if (existing) {
      db.prepare("DELETE FROM bookmarks WHERE id = ?").run(existing.id);
      return ok(res, { bookmarked: false });
    }
    db.prepare("INSERT INTO bookmarks (id, user_id, manga_id, chapter_id) VALUES (?,?,?,?)")
      .run(randomId("bm"), req.user.uid, body.mangaId, body.chapterId);
    ok(res, { bookmarked: true });
  });

  /* ---------- Reading history / progress ---------- */
  router.get("/api/library/history", requireAuth, async (req, res) => {
    const rows = db.prepare(`
      SELECT h.*, m.title, m.cover_image, m.status AS manga_status, m.rating FROM reading_history h
      JOIN manga m ON m.id = h.manga_id WHERE h.user_id = ? ORDER BY h.last_read DESC`).all(req.user.uid);
    ok(res, {
      history: rows.map(r => ({
        mangaId: r.manga_id, title: r.title, cover: r.cover_image, status: r.manga_status, rating: r.rating,
        lastChapterId: r.last_chapter_id, page: r.page, progressPct: r.progress_pct, lastRead: r.last_read,
      }))
    });
  });

  router.post("/api/library/history", requireAuth, async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["mangaId", "chapterId"]);
    const page = clampNumber(body.page, 1, 100000, 1);
    const progressPct = clampNumber(body.progressPct, 0, 100, 0);
    const existing = db.prepare("SELECT id FROM reading_history WHERE user_id = ? AND manga_id = ?").get(req.user.uid, body.mangaId);
    if (existing) {
      db.prepare("UPDATE reading_history SET last_chapter_id=?, page=?, progress_pct=?, last_read=datetime('now') WHERE id=?")
        .run(body.chapterId, page, progressPct, existing.id);
    } else {
      db.prepare("INSERT INTO reading_history (id, user_id, manga_id, last_chapter_id, page, progress_pct) VALUES (?,?,?,?,?,?)")
        .run(randomId("hist"), req.user.uid, body.mangaId, body.chapterId, page, progressPct);
    }
    ok(res, { saved: true });
  });
}

module.exports = { register };
