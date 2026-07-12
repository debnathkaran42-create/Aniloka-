const router = require("express").Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const ctrl = require("../controllers/notifications.controller");

router.get("/", requireAuth, ctrl.listMine);
router.post("/:id/read", requireAuth, verifyCsrf, ctrl.markRead);
router.post("/broadcast", requireAuth, requireAdmin, verifyCsrf, ctrl.broadcast);

module.exports = router;
