const router = require("express").Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const { uploadCover, uploadBanner, uploadPages } = require("../middleware/upload");
const { AppError } = require("../middleware/errorHandler");

function publicUrl(req, subfolder, filename) {
  return `${req.protocol}://${req.get("host")}/uploads/${subfolder}/${filename}`;
}

router.post("/cover", requireAuth, requireAdmin, verifyCsrf, uploadCover.single("image"), (req, res) => {
  if (!req.file) throw new AppError("No image uploaded.", 422);
  res.json({ url: publicUrl(req, "covers", req.file.filename) });
});

router.post("/banner", requireAuth, requireAdmin, verifyCsrf, uploadBanner.single("image"), (req, res) => {
  if (!req.file) throw new AppError("No image uploaded.", 422);
  res.json({ url: publicUrl(req, "banners", req.file.filename) });
});

// Multiple chapter page images at once, in the order they're uploaded
router.post("/pages", requireAuth, requireAdmin, verifyCsrf, uploadPages.array("images", 100), (req, res) => {
  if (!req.files || !req.files.length) throw new AppError("No images uploaded.", 422);
  const urls = req.files.map(f => publicUrl(req, "pages", f.filename));
  res.json({ urls });
});

module.exports = router;
