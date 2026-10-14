const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

function signToken(user) {
  return jwt.sign({ uid: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: '30d' });
}

async function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(payload.uid);
      if (user && !user.banned) {
        req.user = user;
        User.updateOne({ _id: user._id }, { lastSeenAt: new Date() }).catch(() => {});
      }
    } catch {
      /* token invalido/expirado -> segue anonimo */
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

module.exports = { signToken, attachUser, requireAuth, requireAdmin };
