const { premium } = require("../db");
const { PLANS } = require("../config/plans");
const asyncHandler = require("../utils/asyncHandler");

const listPlans = asyncHandler(async (req, res) => {
  res.json({ plans: PLANS });
});

const myStatus = asyncHandler(async (req, res) => {
  const active = premium.findManyBy("userId", req.user.id)
    .find(p => p.status === "active" && (!p.expiryDate || new Date(p.expiryDate) > new Date()));
  res.json({ isPremium: !!active, premium: active || null });
});

module.exports = { listPlans, myStatus };
