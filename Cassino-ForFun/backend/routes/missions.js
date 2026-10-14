const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { User, Transaction } = require('../models');
const { creditUser } = require('../utils/economy');

const router = express.Router();

// Missoes estaticas (progresso calculado a partir das stats do usuario)
const MISSIONS = [
  { id: 'first_bet', nameKey: 'missions.firstBet', goal: 1, stat: 'bets', reward: 5_000 },
  { id: 'bets_100', nameKey: 'missions.bets100', goal: 100, stat: 'bets', reward: 50_000 },
  { id: 'bets_1000', nameKey: 'missions.bets1000', goal: 1000, stat: 'bets', reward: 500_000 },
  { id: 'wagered_10k', nameKey: 'missions.wagered10k', goal: 1_000_000, stat: 'wagered', reward: 100_000 },
  { id: 'level_5', nameKey: 'missions.level5', goal: 5, stat: 'level', reward: 75_000 },
  { id: 'level_10', nameKey: 'missions.level10', goal: 10, stat: 'level', reward: 250_000 },
];

router.get('/', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  const claimed = new Set(
    (await Transaction.find({ user: user._id, type: 'bonus', 'meta.mission': { $exists: true } })).map((t) => t.meta.mission)
  );
  const items = MISSIONS.map((mdef) => {
    const progress = mdef.stat === 'level' ? user.level : user.stats[mdef.stat] || 0;
    return {
      ...mdef,
      progress,
      done: progress >= mdef.goal,
      claimed: claimed.has(mdef.id),
    };
  });
  res.json({ missions: items });
});

router.post('/:id/claim', requireAuth, async (req, res) => {
  const mdef = MISSIONS.find((x) => x.id === req.params.id);
  if (!mdef) return res.status(404).json({ error: 'not_found' });
  const user = await User.findById(req.user._id);
  const progress = mdef.stat === 'level' ? user.level : user.stats[mdef.stat] || 0;
  if (progress < mdef.goal) return res.status(400).json({ error: 'not_done' });
  const already = await Transaction.findOne({ user: user._id, type: 'bonus', 'meta.mission': mdef.id });
  if (already) return res.status(409).json({ error: 'claimed' });
  await creditUser(user._id, mdef.reward, { type: 'bonus', meta: { mission: mdef.id } });
  res.json({ ok: true, reward: mdef.reward });
});

module.exports = router;
