const { users, manga, chapters, transactions, premium } = require("../db");
const { AppError } = require("../middleware/errorHandler");
const asyncHandler = require("../utils/asyncHandler");
const { publicUser } = require("./auth.controller");
const logger = require("../utils/logger");

const dashboard = asyncHandler(async (req, res) => {
  const verifiedTxns = transactions.find(t => t.paymentStatus === "verified");
  const revenue = verifiedTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

  res.json({
    stats: {
      totalUsers: users.count(),
      totalManga: manga.count(),
      totalChapters: chapters.count(),
      premiumUsers: users.find(u => u.isPremium).length,
      pendingPayments: transactions.findManyBy("paymentStatus", "submitted").length,
      totalRevenue: revenue,
      totalTransactions: verifiedTxns.length,
    },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  res.json({ users: users.all().map(publicUser) });
});

const setUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) throw new AppError("Role must be 'user' or 'admin'.", 422);

  const target = users.findById(req.params.id);
  if (!target) throw new AppError("User not found.", 404);

  const updated = users.update(target.id, { role });
  logger.info("User role changed", { userId: target.id, role, by: req.user.id });
  res.json({ user: publicUser(updated) });
});

const grantPremium = asyncHandler(async (req, res) => {
  const target = users.findById(req.params.id);
  if (!target) throw new AppError("User not found.", 404);

  const { plan, days } = req.body;
  const expiryDate = days ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null;

  premium.insert({ userId: target.id, plan: plan || "manual", purchaseDate: new Date().toISOString(), expiryDate, status: "active" });
  users.update(target.id, { isPremium: true });

  logger.info("Premium manually granted", { userId: target.id, by: req.user.id });
  res.json({ ok: true });
});

const revokePremium = asyncHandler(async (req, res) => {
  const target = users.findById(req.params.id);
  if (!target) throw new AppError("User not found.", 404);

  premium.findManyBy("userId", target.id).forEach(p => premium.update(p.id, { status: "revoked" }));
  users.update(target.id, { isPremium: false });

  logger.info("Premium revoked", { userId: target.id, by: req.user.id });
  res.json({ ok: true });
});

module.exports = { dashboard, listUsers, setUserRole, grantPremium, revokePremium };
