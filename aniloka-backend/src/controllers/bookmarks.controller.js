const { bookmarks } = require("../db");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");

const listMine = asyncHandler(async (req, res) => {
  res.json({ bookmarks: bookmarks.findManyBy("userId", req.user.id) });
});

const addBookmark = asyncHandler(async (req, res) => {
  const { mangaId, chapterId } = req.body;
  if (!mangaId || !chapterId) throw new AppError("mangaId and chapterId are required.", 422);

  const existing = bookmarks.find(b => b.userId === req.user.id && b.mangaId === mangaId && b.chapterId === chapterId)[0];
  if (existing) return res.json({ bookmark: existing });

  const bookmark = bookmarks.insert({ userId: req.user.id, mangaId, chapterId, date: new Date().toISOString() });
  res.status(201).json({ bookmark });
});

const removeBookmark = asyncHandler(async (req, res) => {
  const bm = bookmarks.findById(req.params.id);
  if (!bm || bm.userId !== req.user.id) throw new AppError("Bookmark not found.", 404);
  bookmarks.delete(bm.id);
  res.json({ ok: true });
});

module.exports = { listMine, addBookmark, removeBookmark };
