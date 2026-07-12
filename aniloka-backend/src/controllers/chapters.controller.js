const { chapters, manga, premium, transactions } = require("../db");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

/** True if this user can read this chapter: free chapter, active premium, or they
    individually purchased this exact chapter. */
function userCanAccessChapter(user, chapter) {
  if (!chapter.paid) return true;
  if (user.role === "admin") return true;

  const activePremium = premium.findManyBy("userId", user.id)
    .find(p => p.status === "active" && (!p.expiryDate || new Date(p.expiryDate) > new Date()));
  if (activePremium) return true;

  const purchased = transactions.find(t =>
    t.userId === user.id && t.chapterId === chapter.id && t.paymentStatus === "verified"
  );
  return purchased.length > 0;
}

const getChapter = asyncHandler(async (req, res) => {
  const chapter = chapters.findById(req.params.id);
  if (!chapter) throw new AppError("Chapter not found.", 404);

  const canAccess = userCanAccessChapter(req.user, chapter);
  res.json({
    chapter: canAccess ? chapter : { ...chapter, images: [] },
    locked: !canAccess,
    price: chapter.price || 0,
  });
});

const createChapter = asyncHandler(async (req, res) => {
  const parentManga = manga.findById(req.params.mangaId);
  if (!parentManga) throw new AppError("Manga not found.", 404);

  const { number, title, images, paid, price } = req.body;
  if (number === undefined) throw new AppError("Chapter number is required.", 422);

  const chapter = chapters.insert({
    mangaId: parentManga.id,
    number: Number(number),
    title: title || `Chapter ${number}`,
    images: Array.isArray(images) ? images : [],
    paid: !!paid,
    price: paid ? Number(price || 0) : 0,
    uploadDate: new Date().toISOString(),
  });

  logger.info("Chapter created", { chapterId: chapter.id, mangaId: parentManga.id, by: req.user.id });
  res.status(201).json({ chapter });
});

const updateChapter = asyncHandler(async (req, res) => {
  const existing = chapters.findById(req.params.id);
  if (!existing) throw new AppError("Chapter not found.", 404);

  const updated = chapters.update(req.params.id, req.body);
  logger.info("Chapter updated", { chapterId: updated.id, by: req.user.id });
  res.json({ chapter: updated });
});

const deleteChapter = asyncHandler(async (req, res) => {
  const existing = chapters.findById(req.params.id);
  if (!existing) throw new AppError("Chapter not found.", 404);

  chapters.delete(existing.id);
  logger.info("Chapter deleted", { chapterId: existing.id, by: req.user.id });
  res.json({ ok: true });
});

module.exports = { getChapter, createChapter, updateChapter, deleteChapter, userCanAccessChapter };
