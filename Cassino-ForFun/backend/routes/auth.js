const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config');
const { User } = require('../models');
const { signToken, requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { STARTING_BALANCE } = require('../utils/economy');
const pf = require('../utils/provablyFair');

const router = express.Router();
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

const usernameOk = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u || '');
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e || '');

function makeReferralCode(username) {
  return (username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) + crypto.randomBytes(3).toString('hex')).toLowerCase();
}

async function bootstrapUser(user) {
  if (!user.serverSeed) {
    user.serverSeed = pf.randomServerSeed();
    user.serverSeedHash = pf.sha256(user.serverSeed);
    user.clientSeed = crypto.randomBytes(8).toString('hex');
  }
  if (!user.referralCode) user.referralCode = makeReferralCode(user.username);
  await user.save();
  return user;
}

// Registro por e-mail/senha
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, ref } = req.body || {};
    if (!usernameOk(username)) return res.status(400).json({ error: 'invalid_username' });
    if (!emailOk(email)) return res.status(400).json({ error: 'invalid_email' });
    if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'weak_password' });

    const exists = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
    if (exists) return res.status(409).json({ error: 'taken' });

    let referredBy;
    if (ref) {
      const referrer = await User.findOne({ referralCode: String(ref).toLowerCase() });
      if (referrer) referredBy = referrer._id;
    }

    // Primeiro admin: via lista de e-mails no env (ADMIN_EMAILS=a@x.com,b@y.com)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      balance: STARTING_BALANCE,
      referredBy,
      role: adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user',
    });
    await bootstrapUser(user);
    res.json({ token: signToken(user), user: user.toSelf() });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email || '').toLowerCase() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    if (user.banned) return res.status(403).json({ error: 'banned', reason: user.banReason });
    res.json({ token: signToken(user), user: user.toSelf() });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

// Login Google (ID token do @react-oauth/google)
router.post('/google', authLimiter, async (req, res) => {
  try {
    if (!googleClient) return res.status(400).json({ error: 'google_disabled' });
    const { credential, username } = req.body || {};
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    const payload = ticket.getPayload();
    const googleId = payload.sub;

    let user = await User.findOne({ $or: [{ googleId }, { email: payload.email?.toLowerCase() }] });
    if (user) {
      if (user.banned) return res.status(403).json({ error: 'banned', reason: user.banReason });
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      await bootstrapUser(user);
      return res.json({ token: signToken(user), user: user.toSelf() });
    }

    // Primeiro acesso: precisa escolher username
    if (!usernameOk(username)) return res.status(428).json({ error: 'username_required' });
    const taken = await User.findOne({ username });
    if (taken) return res.status(409).json({ error: 'taken' });

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    user = await User.create({
      username,
      email: payload.email?.toLowerCase(),
      googleId,
      avatar: payload.picture || '',
      balance: STARTING_BALANCE,
      role: payload.email && adminEmails.includes(payload.email.toLowerCase()) ? 'admin' : 'user',
    });
    await bootstrapUser(user);
    res.json({ token: signToken(user), user: user.toSelf() });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toSelf() });
});

module.exports = router;
