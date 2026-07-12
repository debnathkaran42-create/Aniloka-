const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const ctrl = require("../controllers/bookmarks.controller");

router.get("/", requireAuth, ctrl.listMine);
router.post("/", requireAuth, verifyCsrf, ctrl.addBookmark);
router.delete("/:id", requireAuth, verifyCsrf, ctrl.removeBookmark);

module.exports = router;
