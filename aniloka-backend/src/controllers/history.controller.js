const { history } = require("../db");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");

const listMine = asyncHandler(async (req, res) => {
  res.json({ history: history.findManyBy("userId", req.user.id) });
});

/** Upserts progress for a manga — one history row per (user, manga). */
const saveProgress = asyncHandler(async (req, res) => {
  const { mangaId, lastChapterId, progress } = req.body;
  if (!mangaId || !lastChapterId) throw new AppError("mangaId and lastChapterId are required.", 422);

  const existing = history.find(h => h.userId === req.user.id && h.mangaId === mangaId)[0];
  const row = existing
    ? history.update(existing.id, { lastChapterId, progress: progress || 0, lastReadAt: new Date().toISOString() })
    : history.insert({ userId: req.user.id, mangaId, lastChapterId, progress: progress || 0, lastReadAt: new Date().toISOString() });

  res.json({ history: row });
});

module.exports = { listMine, saveProgress };
