const express = require('express');
const { SportEvent, SportMarket, SportBet } = require('../models/sports');
const { requireAuth } = require('../middleware/auth');
const { betLimiter } = require('../middleware/rateLimit');
const { chargeUser, MIN_BET, MAX_BET } = require('../utils/economy');

const router = express.Router();

// Lista eventos (agrupavel por esporte no front)
router.get('/events', async (req, res) => {
  const status = ['scheduled', 'live'].includes(req.query.status) ? req.query.status : null;
  const q = status ? { status } : { status: { $in: ['scheduled', 'live'] } };
  if (req.query.sport) q.sportKey = req.query.sport;
  const events = await SportEvent.find(q).sort({ startsAt: 1 }).limit(100);
  const ids = events.map((e) => e._id);
  const markets = await SportMarket.find({ event: { $in: ids }, status: 'open' });
  res.json({
    events: events.map((e) => ({
      ...e.toObject(),
      markets: markets.filter((m) => m.event.equals(e._id)),
    })),
  });
});

router.get('/events/:id', async (req, res) => {
  const ev = await SportEvent.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'not_found' });
  const markets = await SportMarket.find({ event: ev._id });
  res.json({ event: ev, markets });
});

// Apostar
router.post('/bet', requireAuth, betLimiter, async (req, res) => {
  try {
    const { marketId, outcome, stake } = req.body || {};
    const stakeCents = Math.floor(Number(stake));
    if (!Number.isFinite(stakeCents) || stakeCents < MIN_BET || stakeCents > MAX_BET) {
      return res.status(400).json({ error: 'invalid_bet' });
    }
    const market = await SportMarket.findById(marketId);
    if (!market || market.status !== 'open') return res.status(400).json({ error: 'market_closed' });
    const ev = await SportEvent.findById(market.event);
    if (!ev || !['scheduled', 'live'].includes(ev.status) || ev.startsAt <= new Date()) {
      return res.status(400).json({ error: 'market_closed' });
    }
    const oc = market.outcomes.find((o) => o.key === outcome);
    if (!oc) return res.status(400).json({ error: 'invalid_outcome' });

    const potentialPayout = Math.floor(stakeCents * oc.odds);
    await chargeUser(req.user._id, stakeCents, {
      type: 'sport_bet',
      game: 'sports',
      meta: { event: ev._id, outcome, odds: oc.odds },
    });
    const bet = await SportBet.create({
      user: req.user._id,
      market: market._id,
      event: ev._id,
      outcome,
      odds: oc.odds,
      stake: stakeCents,
      potentialPayout,
    });
    res.json({ bet });
  } catch (e) {
    const code = e.message === 'insufficient_funds' ? 402 : 400;
    res.status(code).json({ error: e.message });
  }
});

// Minhas apostas
router.get('/my-bets', requireAuth, async (req, res) => {
  const status = req.query.status;
  const q = { user: req.user._id };
  if (['pending', 'won', 'lost', 'refunded'].includes(status)) q.status = status;
  const items = await SportBet.find(q).sort({ createdAt: -1 }).limit(50).populate({
    path: 'event',
    select: 'homeTeam awayTeam startsAt status homeScore awayScore sportTitle',
  });
  res.json({ items });
});

module.exports = router;
