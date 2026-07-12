const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const ctrl = require("../controllers/auth.controller");

router.post("/signup", authLimiter, [
  body("username").trim().isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters."),
  body("email").trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
], validate, ctrl.signup);

router.post("/login", authLimiter, [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
  body("password").notEmpty().withMessage("Password is required."),
], validate, ctrl.login);

router.post("/logout", ctrl.logout);
router.get("/me", requireAuth, ctrl.me);

router.post("/forgot-password", authLimiter, [
  body("email").trim().isEmail().withMessage("Enter a valid email address."),
], validate, ctrl.forgotPassword);

router.post("/reset-password", authLimiter, [
  body("token").notEmpty(),
  body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
], validate, ctrl.resetPassword);

module.exports = router;
