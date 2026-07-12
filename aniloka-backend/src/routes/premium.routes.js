const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const premiumCtrl = require("../controllers/premium.controller");
const txnCtrl = require("../controllers/transactions.controller");

// Premium
router.get("/premium/plans", requireAuth, premiumCtrl.listPlans);
router.get("/premium/status", requireAuth, premiumCtrl.myStatus);

// Transactions (user)
router.post("/transactions", requireAuth, verifyCsrf, txnCtrl.createTransaction);
router.post("/transactions/:id/submit-utr", requireAuth, verifyCsrf, [
  body("utr").trim().notEmpty().withMessage("Enter your UTR / Transaction ID."),
], validate, txnCtrl.submitUtr);
router.get("/transactions/mine", requireAuth, txnCtrl.myTransactions);

// Transactions (admin)
router.get("/admin/transactions", requireAuth, requireAdmin, txnCtrl.listAllTransactions);
router.post("/admin/transactions/:id/verify", requireAuth, requireAdmin, verifyCsrf, txnCtrl.verifyTransaction);
router.post("/admin/transactions/:id/reject", requireAuth, requireAdmin, verifyCsrf, txnCtrl.rejectTransaction);

module.exports = router;
