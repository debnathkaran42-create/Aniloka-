const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const ctrl = require("../controllers/manga.controller");

router.get("/", requireAuth, ctrl.listManga);
router.get("/:id", requireAuth, ctrl.getManga);

router.post("/", requireAuth, requireAdmin, verifyCsrf, [
  body("title").trim().notEmpty().withMessage("Title is required."),
], validate, ctrl.createManga);

router.put("/:id", requireAuth, requireAdmin, verifyCsrf, ctrl.updateManga);
router.delete("/:id", requireAuth, requireAdmin, verifyCsrf, ctrl.deleteManga);

module.exports = router;
