const { manga, chapters } = require("../db");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

const listManga = asyncHandler(async (req, res) => {
  const { q, genre, author, status } = req.query;
  let results = manga.all();

  if (q) {
    const needle = q.toLowerCase();
    results = results.filter(m => m.title.toLowerCase().includes(needle));
  }
  if (genre) results = results.filter(m => (m.genres || []).includes(genre));
  if (author) results = results.filter(m => (m.author || "").toLowerCase().includes(author.toLowerCase()));
  if (status) results = results.filter(m => m.status === status);

  res.json({ manga: results });
});

const getManga = asyncHandler(async (req, res) => {
  const item = manga.findById(req.params.id);
  if (!item) throw new AppError("Manga not found.", 404);
  const mangaChapters = chapters.findManyBy("mangaId", item.id).sort((a, b) => a.number - b.number);
  res.json({ manga: item, chapters: mangaChapters });
});

const createManga = asyncHandler(async (req, res) => {
  const { title, description, genres, author, artist, cover, banner, status, releaseDate } = req.body;
  if (!title || !title.trim()) throw new AppError("Title is required.", 422);

  const item = manga.insert({
    title: title.trim(),
    description: description || "",
    genres: Array.isArray(genres) ? genres : [],
    author: author || "Unknown",
    artist: artist || "Unknown",
    cover: cover || "",
    banner: banner || "",
    status: status || "Ongoing",
    releaseDate: releaseDate || new Date().toISOString(),
  });

  logger.info("Manga created", { mangaId: item.id, by: req.user.id });
  res.status(201).json({ manga: item });
});

const updateManga = asyncHandler(async (req, res) => {
  const existing = manga.findById(req.params.id);
  if (!existing) throw new AppError("Manga not found.", 404);

  const updated = manga.update(req.params.id, req.body);
  logger.info("Manga updated", { mangaId: updated.id, by: req.user.id });
  res.json({ manga: updated });
});

const deleteManga = asyncHandler(async (req, res) => {
  const existing = manga.findById(req.params.id);
  if (!existing) throw new AppError("Manga not found.", 404);

  chapters.findManyBy("mangaId", existing.id).forEach(ch => chapters.delete(ch.id));
  manga.delete(existing.id);

  logger.info("Manga deleted", { mangaId: existing.id, by: req.user.id });
  res.json({ ok: true });
});

module.exports = { listManga, getManga, createManga, updateManga, deleteManga };
