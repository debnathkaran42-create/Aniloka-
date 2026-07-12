const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const ctrl = require("../controllers/history.controller");

router.get("/", requireAuth, ctrl.listMine);
router.post("/", requireAuth, verifyCsrf, ctrl.saveProgress);

module.exports = router;
