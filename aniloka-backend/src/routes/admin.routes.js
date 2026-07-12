const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const ctrl = require("../controllers/admin.controller");

router.use(requireAuth, requireAdmin);

router.get("/dashboard", ctrl.dashboard);
router.get("/users", ctrl.listUsers);
router.put("/users/:id/role", verifyCsrf, [
  body("role").isIn(["user", "admin"]).withMessage("Role must be 'user' or 'admin'."),
], validate, ctrl.setUserRole);
router.post("/users/:id/grant-premium", verifyCsrf, ctrl.grantPremium);
router.post("/users/:id/revoke-premium", verifyCsrf, ctrl.revokePremium);

module.exports = router;
