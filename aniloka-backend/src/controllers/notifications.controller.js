const { notifications, users } = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

const listMine = asyncHandler(async (req, res) => {
  const mine = notifications.findManyBy("userId", req.user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ notifications: mine });
});

const markRead = asyncHandler(async (req, res) => {
  const n = notifications.findById(req.params.id);
  if (!n || n.userId !== req.user.id) return res.status(404).json({ error: "Notification not found." });
  notifications.update(n.id, { read: true });
  res.json({ ok: true });
});

/** Admin: broadcast a system announcement to every user. */
const broadcast = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(422).json({ error: "Message is required." });

  const allUsers = users.all();
  allUsers.forEach(u => {
    notifications.insert({ userId: u.id, type: "announcement", message: message.trim(), read: false, createdAt: new Date().toISOString() });
  });

  logger.info("Broadcast sent", { by: req.user.id, recipients: allUsers.length });
  res.json({ ok: true, recipients: allUsers.length });
});

module.exports = { listMine, markRead, broadcast };
