const rateLimit = require('express-rate-limit');

const opts = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
};

const authLimiter = rateLimit({ ...opts, windowMs: 60 * 1000, max: 30 });
const betLimiter = rateLimit({ ...opts, windowMs: 5 * 1000, max: 40 });
const sessionLimiter = rateLimit({ ...opts, windowMs: 5 * 1000, max: 80 });
const chatLimiter = rateLimit({ ...opts, windowMs: 10 * 1000, max: 12 });

module.exports = { authLimiter, betLimiter, sessionLimiter, chatLimiter };
