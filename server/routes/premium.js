/* =========================================================
   ANILOKA — PREMIUM & PAYMENTS ROUTES (manual UPI verification)
   -----------------------------------------------------------
   Flow: user picks a plan/chapter -> server creates a pending
   transaction + a UPI deep link -> user pays in their UPI app
   -> user submits the UTR/Transaction ID back to AniLoka ->
   admin checks their bank/UPI app and clicks Verify -> premium
   or chapter access unlocks. No gateway, no fees, but also no
   automatic confirmation — that trade-off is inherent to a
   gateway-less UPI flow and can't be coded away.
   ========================================================= */
const { db } = require("../db/database");
const { randomId } = require("../lib/crypto");
const { ok, created, ApiError, readJSONBody } = require("../lib/respond");
const { required } = require("../lib/validate");
const { requireAuth, requireAdmin } = require("../lib/auth-middleware");
const { buildUpiLink } = require("../lib/upi");

function getSetting(key, fallback = "") {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

function txnRow(row) {
  return {
    id: row.id, userId: row.user_id, type: row.type, refId: row.ref_id, amount: row.amount,
    paymentMethod: row.payment_method, utr: row.utr, status: row.status,
    createdAt: row.created_at, verifiedAt: row.verified_at,
  };
}

function register(router) {
  /* ---------- Plans ---------- */
  router.get("/api/premium/plans", async (req, res) => {
    const plans = db.prepare("SELECT * FROM premium_plans WHERE active = 1 ORDER BY duration_days ASC").all();
    ok(res, { plans: plans.map(p => ({ id: p.id, name: p.name, durationDays: p.duration_days, price: p.price })) });
  });

  /* ---------- Start a premium purchase ---------- */
  router.post("/api/premium/purchase", requireAuth, async (req, res) => {
    const body = await readJSONBody(req);
    required(body, ["planId"]);
    const plan = db.prepare("SELECT * FROM premium_plans WHERE id = ? AND active = 1").get(body.planId);
    if (!plan) throw new ApiError(404, "Plan not found.");

    const id = randomId("txn");
    db.prepare(`INSERT INTO transactions (id, user_id, type, ref_id, amount, payment_method, status)
      VALUES (?,?,?,?,?,?,'pending')`).run(id, req.user.uid, "premium", plan.id, plan.price, "UPI");

    const upiLink = buildUpiLink({
      vpa: getSetting("upi_vpa"), payeeName: getSetting("upi_payee_name"),
      amount: plan.price, note: `AniLoka ${plan.name} Premium`, txnRef: id,
    });
    created(res, { transactionId: id, amount: plan.price, upiLink, plan: { id: plan.id, name: plan.name } });
  });

  /* ---------- Start a single-chapter purchase ---------- */
  router.post("/api/chapters/:id/purchase", requireAuth, async (req, res) => {
    const chapter = db.prepare("SELECT * FROM chapters WHERE id = ?").get(req.params.id);
    if (!chapter) throw new ApiError(404, "Chapter not found.");
    if (!chapter.is_paid) throw new ApiError(400, "This chapter is free — no purchase needed.");
    const already = db.prepare("SELECT 1 FROM chapter_purchases WHERE user_id = ? AND chapter_id = ?").get(req.user.uid, chapter.id);
    if (already) throw new ApiError(409, "You already own this chapter.");

    const id = randomId("txn");
    db.prepare(`INSERT INTO transactions (id, user_id, type, ref_id, amount, payment_method, status)
      VALUES (?,?,?,?,?,?,'pending')`).run(id, req.user.uid, "chapter", chapter.id, chapter.price, "UPI");

    const upiLink = buildUpiLink({
      vpa: getSetting("upi_vpa"), payeeName: getSetting("upi_payee_name"),
      amount: chapter.price, note: `AniLoka Chapter: ${chapter.chapter_title}`, txnRef: id,
    });
    created(res, { transactionId: id, amount: chapter.price, upiLink });
  });

  /* ---------- User submits their UTR / Transaction ID ---------- */
  router.post("/api/transactions/:id/submit-utr", requireAuth, async (req, res) => {
    const txn = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
    if (!txn) throw new ApiError(404, "Transaction not found.");
    if (txn.user_id !== req.user.uid) throw new ApiError(403, "Not your transaction.");
    if (txn.status !== "pending") throw new ApiError(400, `This transaction is already ${txn.status}.`);
    const body = await readJSONBody(req);
    required(body, ["utr"]);
    if (!/^[A-Za-z0-9]{6,25}$/.test(body.utr.trim())) throw new ApiError(400, "That doesn't look like a valid UTR / Transaction ID.");
    db.prepare("UPDATE transactions SET utr = ? WHERE id = ?").run(body.utr.trim(), txn.id);
    ok(res, { message: "Submitted. An admin will verify your payment shortly." });
  });

  /* ---------- My transactions ---------- */
  router.get("/api/transactions/mine", requireAuth, async (req, res) => {
    const rows = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC").all(req.user.uid);
    ok(res, { transactions: rows.map(txnRow) });
  });

  /* ---------- Admin: list all transactions ---------- */
  router.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    const url = new URL(req.url, "http://x");
    const status = url.searchParams.get("status");
    let rows;
    if (status) {
      rows = db.prepare(`SELECT t.*, u.username, u.email FROM transactions t JOIN users u ON u.id = t.user_id
        WHERE t.status = ? ORDER BY t.created_at DESC`).all(status);
    } else {
      rows = db.prepare(`SELECT t.*, u.username, u.email FROM transactions t JOIN users u ON u.id = t.user_id
        ORDER BY t.created_at DESC`).all();
    }
    ok(res, { transactions: rows.map(r => ({ ...txnRow(r), username: r.username, email: r.email })) });
  });

  /* ---------- Admin: verify a transaction -> unlocks access ---------- */
  router.post("/api/admin/transactions/:id/verify", requireAdmin, async (req, res) => {
    const txn = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
    if (!txn) throw new ApiError(404, "Transaction not found.");
    if (txn.status !== "pending") throw new ApiError(400, `Already ${txn.status}.`);

    db.prepare("UPDATE transactions SET status='verified', verified_at=datetime('now'), verified_by=? WHERE id=?")
      .run(req.user.uid, txn.id);

    if (txn.type === "premium") {
      const plan = db.prepare("SELECT * FROM premium_plans WHERE id = ?").get(txn.ref_id);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(txn.user_id);
      const base = (user.is_premium && user.premium_expiry && new Date(user.premium_expiry) > new Date())
        ? new Date(user.premium_expiry) : new Date();
      const expiry = new Date(base.getTime() + (plan ? plan.duration_days : 30) * 24 * 60 * 60 * 1000);
      db.prepare("UPDATE users SET is_premium=1, premium_plan=?, premium_expiry=? WHERE id=?")
        .run(plan ? plan.name : "Premium", expiry.toISOString(), txn.user_id);
      db.prepare("INSERT INTO notifications (id, user_id, type, message) VALUES (?,?,?,?)")
        .run(randomId("notif"), txn.user_id, "premium_activated", `Premium activated: ${plan ? plan.name : ""} plan, valid until ${expiry.toDateString()}.`);
    } else if (txn.type === "chapter") {
      const chapter = db.prepare("SELECT * FROM chapters WHERE id = ?").get(txn.ref_id);
      if (chapter) {
        db.prepare("INSERT OR IGNORE INTO chapter_purchases (id, user_id, manga_id, chapter_id, price) VALUES (?,?,?,?,?)")
          .run(randomId("cp"), txn.user_id, chapter.manga_id, chapter.id, txn.amount);
        db.prepare("INSERT INTO notifications (id, user_id, type, message) VALUES (?,?,?,?)")
          .run(randomId("notif"), txn.user_id, "chapter_unlocked", `Chapter unlocked: ${chapter.chapter_title}.`);
      }
    }
    ok(res, { message: "Verified and access granted." });
  });

  /* ---------- Admin: reject a transaction ---------- */
  router.post("/api/admin/transactions/:id/reject", requireAdmin, async (req, res) => {
    const txn = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
    if (!txn) throw new ApiError(404, "Transaction not found.");
    if (txn.status !== "pending") throw new ApiError(400, `Already ${txn.status}.`);
    db.prepare("UPDATE transactions SET status='rejected', verified_at=datetime('now'), verified_by=? WHERE id=?")
      .run(req.user.uid, txn.id);
    db.prepare("INSERT INTO notifications (id, user_id, type, message) VALUES (?,?,?,?)")
      .run(randomId("notif"), txn.user_id, "payment_rejected", "A recent payment couldn't be verified. Please contact support with your UTR.");
    ok(res, { message: "Transaction rejected." });
  });
}

module.exports = { register };
