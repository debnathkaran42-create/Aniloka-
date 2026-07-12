/* =========================================================
   ANILOKA — PREMIUM STATUS HELPER
   ========================================================= */
const { db } = require("../db/database");

/** Call before trusting a user's is_premium flag — flips it off in the DB if the expiry has passed. */
function refreshPremiumStatus(userId) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return null;
  if (user.is_premium && user.premium_expiry && new Date(user.premium_expiry) < new Date()) {
    db.prepare("UPDATE users SET is_premium = 0 WHERE id = ?").run(userId);
    db.prepare("INSERT INTO notifications (id, user_id, type, message) VALUES (?,?,?,?)")
      .run(require("./crypto").randomId("notif"), userId, "premium_expired", "Your AniLoka Premium subscription has expired.");
    return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  }
  return user;
}

function canAccessChapter(userId, chapter) {
  if (!chapter.is_paid) return true;
  if (!userId) return false;
  const user = refreshPremiumStatus(userId);
  if (user && user.is_premium) return true;
  const purchased = db.prepare("SELECT 1 FROM chapter_purchases WHERE user_id = ? AND chapter_id = ?").get(userId, chapter.id);
  return !!purchased;
}

module.exports = { refreshPremiumStatus, canAccessChapter };
