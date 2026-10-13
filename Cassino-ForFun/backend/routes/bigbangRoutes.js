const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bigbangService = require('../services/bigbang.service');

const router = express.Router();

// --- PROXY ENDPOINTS (Frontend -> Backend -> BigBang) ---

// List games
router.get('/games', async (req, res) => {
  const result = await bigbangService.getGames(req.query);
  res.json(result);
});

// Launch game
router.post('/launch', async (req, res) => {
  const { game_id, user_token, demo = true, language } = req.body;

  console.log(`[BigBang Launch] Request: game_id=${game_id}, user_token=${user_token}, demo=${demo}`);

  if (demo) {
    console.log(`[BigBang Launch] Fetching direct demo URL for game_id=${game_id}`);
    const result = await bigbangService.getDemoUrl(game_id);
    return res.json(result);
  }

  if (!user_token) {
    return res.status(400).json({ success: false, error: { message: 'user_token is required for real money games' } });
  }

  // Ensure player exists in BigBang if not demo
  try {
    const user = await User.findOne({ username: user_token });
    if (user) {
      console.log(`[BigBang Launch] Provisioning player: ${user.username}`);
      await bigbangService.createPlayer(user.username, user.username, 'BR');
    }
  } catch (e) {
    console.error('Error provisioning player in BigBang:', e.message);
  }

  const result = await bigbangService.launchGame({
    game_id,
    user_token,
    demo: false,
    language: language || 'pt',
  });

  console.log(`[BigBang Launch] Response: success=${result.success}, url=${result.game_url}`);
  res.json(result);
});


// --- SEAMLESS WALLET ENDPOINTS (BigBang -> Backend) ---

// user_data: BigBang reads balance
router.get('/wallet/user', async (req, res) => {
  const { username } = req.query;
  console.log(`[BigBang Wallet] Fetching balance for: ${username}`);
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`[BigBang Wallet] User not found: ${username}`);
      return res.status(404).json({ error: 'unknown user' });
    }

    console.log(`[BigBang Wallet] Balance for ${username}: ${user.walletBalance}`);
    res.json({
      username: user.username,
      balance: user.walletBalance.toFixed(2),
      currency: 'EUR', // Project default
    });
  } catch (e) {
    console.error(`[BigBang Wallet] Error: ${e.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// balance_change: BigBang applies bet/win
router.post('/wallet/balance', async (req, res) => {
  const p = req.body || {};
  console.log(`[BigBang Wallet] Balance change request: username=${p.username}, amount=${p.amount}, game=${p.game}`);
  const API_KEY = process.env.BIGBANG_API_KEY;


  // 1. Signature verification
  const base = String(p.username) + String(p.amount) + String(p.game) + String(p.game_category) + String(p.transaction_id);
  const sig = crypto.createHmac('sha256', API_KEY).update(base).digest('hex');

  if (sig !== p.signature) {
    return res.status(401).json({ error: 'bad signature' });
  }

  // 2. Sandbox bypass
  if (p.sandbox) {
    return res.json({ status: 'ok', balance: '100000.00' });
  }

  try {
    // Idempotency check
    const existingTx = await Transaction.findOne({ externalTxId: p.transaction_id });
    if (existingTx) {
      return res.json({
        status: 'ok',
        balance: existingTx.balanceAfter.toFixed(2),
        duplicate: true
      });
    }

    const user = await User.findOne({ username: p.username });
    if (!user) return res.status(404).json({ error: 'unknown user' });

    const amount = Number(p.amount);
    const nextBalance = Math.round((user.walletBalance + amount) * 100) / 100;

    if (nextBalance < 0) {
      return res.status(400).json({
        error: 'insufficient balance',
        balance: user.walletBalance.toFixed(2)
      });
    }

    // Atomic update (ideally in a session/transaction)
    user.walletBalance = nextBalance;
    await user.save();

    // Record transaction
    await Transaction.create({
      userId: user._id,
      type: 'bigbang',
      direction: amount < 0 ? 'debit' : 'credit',
      amount: Math.abs(amount),
      balanceAfter: nextBalance,
      externalTxId: p.transaction_id,
      meta: {
        game: p.game,
        game_category: p.game_category,
        round_id: p.round_id,
        type: p.type,
      }
    });

    res.json({ status: 'ok', balance: nextBalance.toFixed(2) });
  } catch (e) {
    console.error('Wallet balance error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
