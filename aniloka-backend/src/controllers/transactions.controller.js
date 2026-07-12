const { transactions, premium, users, notifications, chapters } = require("../db");
const { PLANS } = require("../config/plans");
const { buildUpiLink, buildUpiQrDataUrl } = require("../utils/upi");
const { AppError } = require("../middleware/errorHandler");
const { newId } = require("../db/AnilokaDB");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

/** Step 1: user chooses a plan (or a single paid chapter) -> we create a pending
    transaction and hand back a UPI link + QR code to pay with. */
const createTransaction = asyncHandler(async (req, res) => {
  const { plan, chapterId } = req.body;

  let amount, note, planKey = null;
  if (plan) {
    const planInfo = PLANS[plan];
    if (!planInfo) throw new AppError("Unknown plan.", 422);
    amount = planInfo.price;
    note = `AniLoka ${planInfo.label} Premium`;
    planKey = plan;
  } else if (chapterId) {
    const chapter = chapters.findById(chapterId);
    if (!chapter || !chapter.paid) throw new AppError("This chapter isn't for sale.", 422);
    amount = chapter.price;
    note = `AniLoka Chapter Unlock`;
  } else {
    throw new AppError("Specify a plan or a chapterId to purchase.", 422);
  }

  const txn = transactions.insert({
    userId: req.user.id,
    amount,
    plan: planKey,
    chapterId: chapterId || null,
    paymentMethod: "UPI",
    paymentStatus: "pending", // pending -> submitted -> verified | rejected
    utr: null,
    purchaseDate: new Date().toISOString(),
  });

  const upiLink = buildUpiLink({ amount, transactionNote: note, transactionRefId: txn.id });
  const qrCodeDataUrl = await buildUpiQrDataUrl(upiLink);

  res.status(201).json({ transaction: txn, upiLink, qrCodeDataUrl });
});

/** Step 2: after paying in their UPI app, the user comes back and submits the UTR
    (transaction reference number) so an admin can verify it against their bank. */
const submitUtr = asyncHandler(async (req, res) => {
  const { utr } = req.body;
  if (!utr || utr.trim().length < 6) throw new AppError("Enter a valid UTR / Transaction ID.", 422);

  const txn = transactions.findById(req.params.id);
  if (!txn) throw new AppError("Transaction not found.", 404);
  if (txn.userId !== req.user.id) throw new AppError("Not your transaction.", 403);
  if (txn.paymentStatus !== "pending") throw new AppError("This transaction was already submitted.", 400);

  const updated = transactions.update(txn.id, { utr: utr.trim(), paymentStatus: "submitted" });
  logger.info("UTR submitted", { transactionId: txn.id, userId: req.user.id });
  res.json({ transaction: updated });
});

const myTransactions = asyncHandler(async (req, res) => {
  const mine = transactions.findManyBy("userId", req.user.id).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
  res.json({ transactions: mine });
});

/** Step 3 (admin): approve a submitted transaction — activates premium or unlocks the chapter. */
const verifyTransaction = asyncHandler(async (req, res) => {
  const txn = transactions.findById(req.params.id);
  if (!txn) throw new AppError("Transaction not found.", 404);
  if (txn.paymentStatus !== "submitted") throw new AppError("Only submitted transactions can be verified.", 400);

  transactions.update(txn.id, { paymentStatus: "verified", verifiedBy: req.user.id, verifiedAt: new Date().toISOString() });

  if (txn.plan) {
    const planInfo = PLANS[txn.plan];
    const expiryDate = planInfo.days ? new Date(Date.now() + planInfo.days * 86400000).toISOString() : null;
    premium.insert({
      userId: txn.userId, plan: txn.plan,
      purchaseDate: new Date().toISOString(), expiryDate, status: "active",
    });
    users.update(txn.userId, { isPremium: true });
  }

  notifications.insert({
    userId: txn.userId,
    type: "premium_activated",
    message: txn.plan ? `Your ${PLANS[txn.plan].label} Premium is now active!` : "Your chapter purchase was approved!",
    read: false,
    createdAt: new Date().toISOString(),
  });

  logger.info("Transaction verified", { transactionId: txn.id, by: req.user.id });
  res.json({ ok: true });
});

const rejectTransaction = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const txn = transactions.findById(req.params.id);
  if (!txn) throw new AppError("Transaction not found.", 404);

  transactions.update(txn.id, { paymentStatus: "rejected", rejectionReason: reason || "Could not verify payment." });

  notifications.insert({
    userId: txn.userId,
    type: "payment_rejected",
    message: `Your payment could not be verified: ${reason || "please contact support."}`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  logger.info("Transaction rejected", { transactionId: txn.id, by: req.user.id });
  res.json({ ok: true });
});

const listAllTransactions = asyncHandler(async (req, res) => {
  const { status } = req.query;
  let all = transactions.all().sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
  if (status) all = all.filter(t => t.paymentStatus === status);
  res.json({ transactions: all });
});

module.exports = {
  createTransaction, submitUtr, myTransactions,
  verifyTransaction, rejectTransaction, listAllTransactions,
};
