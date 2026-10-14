const express = require('express');
const mongoose = require('mongoose');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { User, Transaction } = require('../models');
const { SportEvent, SportMarket, SportBet } = require('../models/sports');
const economy = require('../utils/economy');
const sportsService = require('../services/oddsApi');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ---------------- Usuarios ----------------
router.get('/users', async (req, res) => {
  const q = req.query.q ? { username: new RegExp(String(req.query.q).slice(0, 30), 'i') } : {};
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 25;
  const [items, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-passwordHash'),
    User.countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

router.post('/users/:id/role', async (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'moderator', 'admin'].includes(role)) return res.status(400).json({ error: 'invalid_role' });
  if (req.user._id.equals(req.params.id) && role !== 'admin') {
    return res.status(400).json({ error: 'cannot_demote_self' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, role: user.role });
});

router.post('/users/:id/ban', async (req, res) => {
  const { banned, reason } = req.body || {};
  if (req.user._id.equals(req.params.id)) return res.status(400).json({ error: 'cannot_ban_self' });
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { banned: Boolean(banned), banReason: banned ? String(reason || '').slice(0, 140) : '' },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, banned: user.banned });
});

router.post('/users/:id/adjust', async (req, res) => {
  const amount = Math.floor(Number(req.body?.amount));
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100_000_000) {
    return res.status(400).json({ error: 'invalid_amount' });
  }
  try {
    if (amount > 0) {
      await economy.creditUser(req.params.id, amount, { type: 'admin_adjust', meta: { by: req.user.username } });
    } else {
      await economy.chargeUser(req.params.id, -amount, { type: 'admin_adjust', meta: { by: req.user.username }, awardXp: false });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------------- Dashboard ----------------
router.get('/stats', async (_req, res) => {
  const [users, bets, wageredAgg, sportBets] = await Promise.all([
    User.countDocuments({}),
    Transaction.countDocuments({ type: 'bet' }),
    Transaction.aggregate([
      { $match: { type: 'bet' } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } },
    ]),
    SportBet.countDocuments({}),
  ]);
  res.json({ users, bets, wagered: wageredAgg[0]?.total || 0, sportBets });
});

// ---------------- Esportes ----------------
router.post('/sports/sync', async (req, res) => {
  const out = await sportsService.syncEvents(req.app.get('io'));
  res.json(out);
});

router.get('/sports/events', async (req, res) => {
  const events = await SportEvent.find({}).sort({ startsAt: -1 }).limit(60);
  res.json({ events });
});

// Criar evento/mercado manual (fallback quando a API esta fora)
router.post('/sports/events', async (req, res) => {
  const { sportKey, homeTeam, awayTeam, startsAt, outcomes } = req.body || {};
  if (!homeTeam || !awayTeam || !startsAt || !Array.isArray(outcomes) || outcomes.length < 2) {
    return res.status(400).json({ error: 'invalid' });
  }
  for (const o of outcomes) {
    if (!['home', 'draw', 'away'].includes(o.key) || !(Number(o.odds) >= 1.01)) {
      return res.status(400).json({ error: 'invalid_outcomes' });
    }
  }
  const ev = await SportEvent.create({
    sportKey: sportKey || 'manual',
    sportTitle: sportKey || 'Manual',
    homeTeam,
    awayTeam,
    startsAt: new Date(startsAt),
    status: 'scheduled',
  });
  const market = await SportMarket.create({
    event: ev._id,
    key: 'h2h',
    outcomes: outcomes.map((o) => ({ key: o.key, label: o.label || o.key, odds: Number(o.odds) })),
  });
  res.json({ event: ev, market });
});

// Resolver manualmente
router.post('/sports/events/:id/resolve', async (req, res) => {
  const { homeScore, awayScore } = req.body || {};
  if (homeScore == null || awayScore == null) return res.status(400).json({ error: 'invalid_score' });
  const ev = await SportEvent.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'not_found' });
  ev.homeScore = Number(homeScore);
  ev.awayScore = Number(awayScore);
  ev.status = 'finished';
  await ev.save();
  await sportsService.settleFinished(req.app.get('io'));
  res.json({ ok: true });
});

// Suspender/reabrir mercado
router.post('/sports/markets/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['open', 'suspended', 'cancelled'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
  const market = await SportMarket.findById(req.params.id);
  if (!market) return res.status(404).json({ error: 'not_found' });
  market.status = status;
  await market.save();

  // Cancelar => reembolsa apostas pendentes
  if (status === 'cancelled') {
    const bets = await SportBet.find({ market: market._id, status: 'pending' });
    for (const bet of bets) {
      bet.status = 'refunded';
      bet.settledAt = new Date();
      await bet.save();
      await economy.creditUser(bet.user, bet.stake, { type: 'sport_refund', game: 'sports', meta: { market: market._id } });
    }
  }
  res.json({ ok: true });
});

// Transacoes recentes (auditoria)
router.get('/transactions', async (req, res) => {
  const items = await Transaction.find({}).sort({ createdAt: -1 }).limit(100).populate('user', 'username');
  res.json({ items });
});

module.exports = router;
