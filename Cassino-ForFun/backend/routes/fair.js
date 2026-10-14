const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { User, LiveRound } = require('../models');
const pf = require('../utils/provablyFair');

const router = express.Router();

// Estado atual das seeds do usuario (hash publicado, seed NAO revelada)
router.get('/seed', requireAuth, (req, res) => {
  res.json({
    clientSeed: req.user.clientSeed,
    serverSeedHash: req.user.serverSeedHash,
    nonce: req.user.nonce,
    revealedSeeds: req.user.revealedSeeds.slice(-20),
  });
});

// Rotacionar seed: revela a antiga (verificavel contra o hash) e gera nova
router.post('/seed/rotate', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.revealedSeeds.push({
    serverSeed: user.serverSeed,
    serverSeedHash: user.serverSeedHash,
    rotateAtNonce: user.nonce,
    revealedAt: new Date(),
  });
  if (user.revealedSeeds.length > 50) user.revealedSeeds = user.revealedSeeds.slice(-50);
  user.serverSeed = pf.randomServerSeed();
  user.serverSeedHash = pf.sha256(user.serverSeed);
  user.nonce = 0;
  await user.save();
  res.json({ serverSeedHash: user.serverSeedHash, nonce: 0 });
});

router.post('/seed/client', requireAuth, async (req, res) => {
  const { clientSeed } = req.body || {};
  if (typeof clientSeed !== 'string' || clientSeed.length < 1 || clientSeed.length > 64) {
    return res.status(400).json({ error: 'invalid' });
  }
  req.user.clientSeed = clientSeed;
  await req.user.save();
  res.json({ clientSeed: req.user.clientSeed });
});

// Verificador publico: calcula floats de qualquer combinacao
router.post('/verify', (req, res) => {
  const { serverSeed, clientSeed, nonce, cursor = 0, count = 1 } = req.body || {};
  if (!serverSeed || !clientSeed) return res.status(400).json({ error: 'invalid' });
  const n = Math.min(100, Math.max(1, parseInt(count, 10) || 1));
  const floats = [];
  for (let i = 0; i < n; i++) {
    floats.push(pf.fairFloat(serverSeed, clientSeed, Number(nonce) || 0, Number(cursor) + i));
  }
  res.json({ floats, serverSeedHash: pf.sha256(serverSeed) });
});

// Historico de rounds ao vivo (crash/coinflip) — seeds reveladas apos o round
router.get('/live-rounds', async (req, res) => {
  const game = req.query.game === 'coinflip' ? 'coinflip' : 'crash';
  const items = await LiveRound.find({ game }).sort({ roundId: -1 }).limit(30);
  res.json({ items });
});

module.exports = router;
