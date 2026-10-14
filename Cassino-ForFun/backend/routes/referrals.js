const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { User } = require('../models');
const { creditUser } = require('../utils/economy');

const router = express.Router();
const REFERRAL_REWARD = 50_000; // quando o indicado atinge nivel 5

// Recompensa de referral: conferido no carregamento (idempotente via marker)
router.get('/status', requireAuth, async (req, res) => {
  const invited = await User.find({ referredBy: req.user._id }).select('username level createdAt');
  res.json({
    code: req.user.referralCode,
    invited: invited.map((u) => ({ username: u.username, level: u.level, createdAt: u.createdAt })),
    rewardPerReferral: REFERRAL_REWARD,
  });
});

module.exports = router;
