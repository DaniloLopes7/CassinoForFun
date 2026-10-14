const express = require('express');
const { User, Transaction, Notification, Friend } = require('../models');
const { requireAuth } = require('../middleware/auth');
const economy = require('../utils/economy');

const router = express.Router();

// Perfil publico por username
router.get('/by-username/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({ user: user.toPublic() });
});

// Perfil publico
router.get('/profile/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({ user: user.toPublic() });
});

// Historico de transacoes
router.get('/me/transactions', requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 20;
  const [items, total] = await Promise.all([
    Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments({ user: req.user._id }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

// Bonus diario com streak
const DAILY_BASE = 25_000; // R$ 250
const DAILY_STREAK_STEP = 5_000; // +R$ 50 por dia de streak (max 7)
router.post('/me/daily-bonus', requireAuth, async (req, res) => {
  const now = new Date();
  const last = req.user.lastDailyBonusAt;
  if (last && now - last < 20 * 3600 * 1000) {
    return res.status(429).json({ error: 'not_yet', nextAt: new Date(last.getTime() + 20 * 3600 * 1000) });
  }
  const streak = last && now - last < 44 * 3600 * 1000 ? req.user.dailyStreak + 1 : 1;
  const cappedStreak = Math.min(7, streak);
  const amount = DAILY_BASE + (cappedStreak - 1) * DAILY_STREAK_STEP;

  req.user.lastDailyBonusAt = now;
  req.user.dailyStreak = cappedStreak;
  await req.user.save();
  await economy.creditUser(req.user._id, amount, { type: 'daily_gift', meta: { streak: cappedStreak } });
  res.json({ amount, streak: cappedStreak, balance: req.user.balance + amount });
});

// Rede de seguranca: saldo zerado recebe recarga (cooldown 1h)
router.post('/me/safety-net', requireAuth, async (req, res) => {
  if (req.user.balance > 0) return res.status(400).json({ error: 'not_eligible' });
  const last = req.user.lastSafetyNetAt;
  if (last && Date.now() - last.getTime() < economy.SAFETY_NET_COOLDOWN_MS) {
    return res.status(429).json({ error: 'cooldown', nextAt: new Date(last.getTime() + economy.SAFETY_NET_COOLDOWN_MS) });
  }
  req.user.lastSafetyNetAt = new Date();
  await req.user.save();
  await economy.creditUser(req.user._id, economy.SAFETY_NET_AMOUNT, { type: 'bonus', meta: { kind: 'safety_net' } });
  res.json({ amount: economy.SAFETY_NET_AMOUNT });
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  const by = req.query.by === 'wagered' ? 'stats.wagered' : 'stats.won';
  const top = await User.find({ banned: false }).sort({ [by]: -1 }).limit(50).select('username avatar level stats');
  res.json({ top });
});

// Amigos
router.get('/friends', requireAuth, async (req, res) => {
  const rows = await Friend.find({
    $or: [{ user: req.user._id }, { friend: req.user._id }],
  }).populate('user friend', 'username avatar level');
  res.json({
    friends: rows.filter((r) => r.status === 'accepted').map((r) => (r.user._id.equals(req.user._id) ? r.friend : r.user)),
    incoming: rows.filter((r) => r.status === 'pending' && r.friend._id.equals(req.user._id)).map((r) => r.user),
    outgoing: rows.filter((r) => r.status === 'pending' && r.user._id.equals(req.user._id)).map((r) => r.friend),
  });
});

router.post('/friends/:username/request', requireAuth, async (req, res) => {
  const target = await User.findOne({ username: req.params.username });
  if (!target || target._id.equals(req.user._id)) return res.status(400).json({ error: 'invalid' });
  const exists = await Friend.findOne({
    $or: [
      { user: req.user._id, friend: target._id },
      { user: target._id, friend: req.user._id },
    ],
  });
  if (exists) return res.status(409).json({ error: 'exists' });
  await Friend.create({ user: req.user._id, friend: target._id });
  res.json({ ok: true });
});

router.post('/friends/:username/accept', requireAuth, async (req, res) => {
  const target = await User.findOne({ username: req.params.username });
  if (!target) return res.status(404).json({ error: 'not_found' });
  const row = await Friend.findOne({ user: target._id, friend: req.user._id, status: 'pending' });
  if (!row) return res.status(404).json({ error: 'not_found' });
  row.status = 'accepted';
  await row.save();
  res.json({ ok: true });
});

// Notificacoes
router.get('/notifications', requireAuth, async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
  res.json({ items });
});
router.post('/notifications/read', requireAuth, async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { read: true });
  res.json({ ok: true });
});

// Avatar
router.post('/me/avatar', requireAuth, async (req, res) => {
  const { avatar } = req.body || {};
  if (typeof avatar !== 'string' || avatar.length > 300) return res.status(400).json({ error: 'invalid' });
  req.user.avatar = avatar;
  await req.user.save();
  res.json({ ok: true, avatar });
});

module.exports = router;
