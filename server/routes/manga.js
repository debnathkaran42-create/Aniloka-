/* =========================================================
   ANILOKA — MANGA & CHAPTER ROUTES
   ========================================================= */
const { db } = require("../db/database");
const { randomId } = require("../lib/crypto");
const { ok, created, fail, ApiError, readJSONBody } = require("../lib/respond");
const { required, sanitizeText, clampNumber } = require("../lib/validate");
const { requireAdmin, optionalAuth } = require("../lib/auth-middleware");
const { saveBase64Image, deleteUploadedFile } = require("../lib/upload");

const { canAccessChapter } = require("../lib/premium");

function mangaRow(row, chapterCount) {
  return {
    id: row.id, title: row.title, description: row.description,
    genres: JSON.parse(row.genres || "[]"), author: row.author, artist: row.artist,
    publisher: row.publisher, cover: row.cover_image, banner: row.banner_image,
    status: row.status, year: row.release_year, rating: row.rating,
    featured: !!row.featured, trending: !!row.trending, popular: !!row.popular,
    chapterCount: chapterCount ?? undefined,
  };
}

/** includeImages should only be true once the caller has confirmed the requester can access this chapter. */
function chapterRow(row, includeImages = false) {
  const images = JSON.parse(row.images || "[]");
  return {
    id: row.id, mangaId: row.manga_id, number: row.chapter_number, title: row.chapter_title,
    pages: images.length, paid: !!row.is_paid, price: row.price, date: row.upload_date,
    images: includeImages ? images : undefined,
  };
}

function register(router) {
  /* ---------- List / search manga ---------- */
  router.get("/api/manga", optionalAuth, async (req, res) => {
    const url = new URL(req.url, "http://x");
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const genre = url.searchParams.get("genre") || "";
    const author = (url.searchParams.get("author") || "").toLowerCase();
    const publisher = (url.searchParams.get("publisher") || "").toLowerCase();
    const year = url.searchParams.get("year") || "";

    let rows = db.prepare("SELECT * FROM manga ORDER BY created_at DESC").all();
    rows = rows.filter(r => {
      if (q && !r.title.toLowerCase().includes(q)) return false;
      if (genre && !JSON.parse(r.genres || "[]").includes(genre)) return false;
      if (author && !r.author.toLowerCase().includes(author)) return false;
      if (publisher && !r.publisher.toLowerCase().includes(publisher)) return false;
      if (year && String(r.release_year) !== String(year)) return false;
      return true;
    });

    const countStmt = db.prepare("SELECT COUNT(*) AS c FROM chapters WHERE manga_id = ?");
    ok(res, { manga: rows.map(r => mangaRow(r, countStmt.get(r.id).c)) });
  });

  /* ---------- Single manga + its chapters ---------- */
  router.get("/api/manga/:id", optionalAuth, async (req, res) => {
    const row = db.prepare("SELECT * FROM manga WHERE id = ?").get(req.params.id);
    if (!row) throw new ApiError(404, "Manga not found.");
    const chapters = db.prepare("SELECT * FROM chapters WHERE manga_id = ? ORDER BY chapter_number ASC").all(row.id);
    const chaptersOut = chapters.map(ch => ({
      ...chapterRow(ch, false),
      locked: !canAccessChapter(req.user && req.user.uid, ch),
    }));
    ok(res, { manga: mangaRow(row, chapters.length), chapters: chaptersOut });
  });

  /* ---------- Create manga (admin) ---------- */
  router.post("/api/manga", requireAdmin, async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["title"]);
    const id = randomId("manga");

    let cover = null, banner = null;
    if (body.coverImageBase64) cover = saveBase64Image(body.coverImageBase64, "covers");
    if (body.bannerImageBase64) banner = saveBase64Image(body.bannerImageBase64, "banners");

    db.prepare(`INSERT INTO manga
      (id, title, description, genres, author, artist, publisher, cover_image, banner_image, status, release_year, rating, featured, trending, popular)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, sanitizeText(body.title, 200), sanitizeText(body.description, 5000),
      JSON.stringify(body.genres || []), sanitizeText(body.author || "Unknown", 100),
      sanitizeText(body.artist || "Unknown", 100), sanitizeText(body.publisher || "Unknown", 100),
      cover, banner, sanitizeText(body.status || "Ongoing", 30),
      clampNumber(body.year, 1900, 2100, new Date().getFullYear()), clampNumber(body.rating, 0, 5, 0),
      body.featured ? 1 : 0, body.trending ? 1 : 0, body.popular ? 1 : 0
    );
    const row = db.prepare("SELECT * FROM manga WHERE id = ?").get(id);
    created(res, { manga: mangaRow(row, 0) });
  });

  /* ---------- Update manga (admin) ---------- */
  router.put("/api/manga/:id", requireAdmin, async (req, res) => {
    const existing = db.prepare("SELECT * FROM manga WHERE id = ?").get(req.params.id);
    if (!existing) throw new ApiError(404, "Manga not found.");
    const body = await readJSONBody(req);

    let cover = existing.cover_image, banner = existing.banner_image;
    if (body.coverImageBase64) { if (cover) deleteUploadedFile(cover); cover = saveBase64Image(body.coverImageBase64, "covers"); }
    if (body.removeCover) { if (cover) deleteUploadedFile(cover); cover = null; }
    if (body.bannerImageBase64) { if (banner) deleteUploadedFile(banner); banner = saveBase64Image(body.bannerImageBase64, "banners"); }
    if (body.removeBanner) { if (banner) deleteUploadedFile(banner); banner = null; }

    db.prepare(`UPDATE manga SET title=?, description=?, genres=?, author=?, artist=?, publisher=?,
      cover_image=?, banner_image=?, status=?, release_year=?, rating=?, featured=?, trending=?, popular=?, updated_at=datetime('now')
      WHERE id=?`).run(
      sanitizeText(body.title ?? existing.title, 200), sanitizeText(body.description ?? existing.description, 5000),
      JSON.stringify(body.genres ?? JSON.parse(existing.genres || "[]")),
      sanitizeText(body.author ?? existing.author, 100), sanitizeText(body.artist ?? existing.artist, 100),
      sanitizeText(body.publisher ?? existing.publisher, 100), cover, banner,
      sanitizeText(body.status ?? existing.status, 30),
      clampNumber(body.year, 1900, 2100, existing.release_year), clampNumber(body.rating, 0, 5, existing.rating),
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured,
      body.trending !== undefined ? (body.trending ? 1 : 0) : existing.trending,
      body.popular !== undefined ? (body.popular ? 1 : 0) : existing.popular,
      req.params.id
    );
    const row = db.prepare("SELECT * FROM manga WHERE id = ?").get(req.params.id);
    ok(res, { manga: mangaRow(row) });
  });

  /* ---------- Delete manga (admin) ---------- */
  router.delete("/api/manga/:id", requireAdmin, async (req, res) => {
    const existing = db.prepare("SELECT * FROM manga WHERE id = ?").get(req.params.id);
    if (!existing) throw new ApiError(404, "Manga not found.");
    const chapters = db.prepare("SELECT * FROM chapters WHERE manga_id = ?").all(req.params.id);
    chapters.forEach(ch => JSON.parse(ch.images || "[]").forEach(deleteUploadedFile));
    if (existing.cover_image) deleteUploadedFile(existing.cover_image);
    if (existing.banner_image) deleteUploadedFile(existing.banner_image);
    db.prepare("DELETE FROM manga WHERE id = ?").run(req.params.id); // cascades to chapters/bookmarks/etc.
    ok(res, { message: "Manga deleted." });
  });

  /* ---------- Chapters ---------- */
  router.get("/api/manga/:mangaId/chapters", optionalAuth, async (req, res) => {
    const rows = db.prepare("SELECT * FROM chapters WHERE manga_id = ? ORDER BY chapter_number ASC").all(req.params.mangaId);
    ok(res, { chapters: rows.map(ch => ({ ...chapterRow(ch, false), locked: !canAccessChapter(req.user && req.user.uid, ch) })) });
  });

  /* Protected: only returns page images if the requester can actually access this chapter. */
  router.get("/api/chapters/:id/read", optionalAuth, async (req, res) => {
    const row = db.prepare("SELECT * FROM chapters WHERE id = ?").get(req.params.id);
    if (!row) throw new ApiError(404, "Chapter not found.");
    if (!canAccessChapter(req.user && req.user.uid, row)) {
      throw new ApiError(402, "This chapter is locked. Purchase it or upgrade to Premium to read.");
    }
    ok(res, { chapter: chapterRow(row, true) });
  });

  router.post("/api/manga/:mangaId/chapters", requireAdmin, async (req, res) => {
    const manga = db.prepare("SELECT id FROM manga WHERE id = ?").get(req.params.mangaId);
    if (!manga) throw new ApiError(404, "Manga not found.");
    const body = await readJSONBody(req);
    required(body, ["number", "title"]);

    const images = Array.isArray(body.imagesBase64)
      ? body.imagesBase64.map((b64, i) => saveBase64Image(b64, `pages/${req.params.mangaId}/${randomId("ch")}`))
      : [];

    const id = randomId("ch");
    db.prepare(`INSERT INTO chapters (id, manga_id, chapter_number, chapter_title, images, is_paid, price)
      VALUES (?,?,?,?,?,?,?)`).run(
      id, req.params.mangaId, clampNumber(body.number, 0, 100000, 1), sanitizeText(body.title, 200),
      JSON.stringify(images), body.paid ? 1 : 0, clampNumber(body.price, 0, 100000, 0)
    );
    const row = db.prepare("SELECT * FROM chapters WHERE id = ?").get(id);
    created(res, { chapter: chapterRow(row) });
  });

  router.put("/api/chapters/:id", requireAdmin, async (req, res) => {
    const existing = db.prepare("SELECT * FROM chapters WHERE id = ?").get(req.params.id);
    if (!existing) throw new ApiError(404, "Chapter not found.");
    const body = await readJSONBody(req);

    let images = JSON.parse(existing.images || "[]");
    if (Array.isArray(body.imagesBase64) && body.imagesBase64.length) {
      images.forEach(deleteUploadedFile);
      images = body.imagesBase64.map(b64 => saveBase64Image(b64, `pages/${existing.manga_id}/${existing.id}`));
    }
    if (Array.isArray(body.removeImageUrls) && body.removeImageUrls.length) {
      body.removeImageUrls.forEach(deleteUploadedFile);
      images = images.filter(url => !body.removeImageUrls.includes(url));
    }

    db.prepare(`UPDATE chapters SET chapter_number=?, chapter_title=?, images=?, is_paid=?, price=? WHERE id=?`).run(
      clampNumber(body.number, 0, 100000, existing.chapter_number),
      sanitizeText(body.title ?? existing.chapter_title, 200),
      JSON.stringify(images),
      body.paid !== undefined ? (body.paid ? 1 : 0) : existing.is_paid,
      clampNumber(body.price, 0, 100000, existing.price),
      req.params.id
    );
    const row = db.prepare("SELECT * FROM chapters WHERE id = ?").get(req.params.id);
    ok(res, { chapter: chapterRow(row) });
  });

  router.delete("/api/chapters/:id", requireAdmin, async (req, res) => {
    const existing = db.prepare("SELECT * FROM chapters WHERE id = ?").get(req.params.id);
    if (!existing) throw new ApiError(404, "Chapter not found.");
    JSON.parse(existing.images || "[]").forEach(deleteUploadedFile);
    db.prepare("DELETE FROM chapters WHERE id = ?").run(req.params.id);
    ok(res, { message: "Chapter deleted." });
  });
}

module.exports = { register, mangaRow, chapterRow };
