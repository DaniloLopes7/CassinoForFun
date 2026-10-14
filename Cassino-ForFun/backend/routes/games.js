const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { betLimiter, sessionLimiter } = require('../middleware/rateLimit');
const games = require('../games/solo');

const router = express.Router();
const handler = (fn) => async (req, res) => {
  try {
    const out = await fn(req);
    res.json(out);
  } catch (e) {
    const msg = e.message || 'server_error';
    const code = msg === 'insufficient_funds' ? 402 : msg === 'invalid_bet' || msg === 'invalid_params' ? 400 : msg === 'session_not_found' ? 404 : 400;
    res.status(code).json({ error: msg });
  }
};

router.post('/slots', requireAuth, betLimiter, handler((req) => games.playSlots(req.user, req.body.bet, req.body.clientSeed)));
router.post('/dice', requireAuth, betLimiter, handler((req) => games.playDice(req.user, req.body.bet, req.body, req.body.clientSeed)));
router.post('/plinko', requireAuth, betLimiter, handler((req) => games.playPlinko(req.user, req.body.bet, req.body, req.body.clientSeed)));

// Mines
router.post('/mines/start', requireAuth, betLimiter, handler((req) => games.minesStart(req.user, req.body.bet, req.body, req.body.clientSeed)));
router.post('/mines/:id/reveal', requireAuth, sessionLimiter, handler((req) => games.minesAction(req.user, req.params.id, 'reveal', req.body)));
router.post('/mines/:id/cashout', requireAuth, sessionLimiter, handler((req) => games.minesAction(req.user, req.params.id, 'cashout')));

// HiLo
router.post('/hilo/start', requireAuth, betLimiter, handler((req) => games.hiloStart(req.user, req.body.bet, req.body.clientSeed)));
router.post('/hilo/:id/guess', requireAuth, sessionLimiter, handler((req) => games.hiloGuess(req.user, req.params.id, req.body.direction)));
router.post('/hilo/:id/cashout', requireAuth, sessionLimiter, handler((req) => games.hiloCashout(req.user, req.params.id)));

// Blackjack
router.post('/blackjack/deal', requireAuth, betLimiter, handler((req) => games.blackjackDeal(req.user, req.body.bet, req.body.clientSeed)));
router.post('/blackjack/:id/:action', requireAuth, sessionLimiter, handler((req) => games.blackjackAction(req.user, req.params.id, req.params.action)));

module.exports = router;
