const router = require("express").Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const ctrl = require("../controllers/chapters.controller");

router.get("/:id", requireAuth, ctrl.getChapter);
router.post("/manga/:mangaId", requireAuth, requireAdmin, verifyCsrf, ctrl.createChapter);
router.put("/:id", requireAuth, requireAdmin, verifyCsrf, ctrl.updateChapter);
router.delete("/:id", requireAuth, requireAdmin, verifyCsrf, ctrl.deleteChapter);

module.exports = router;
