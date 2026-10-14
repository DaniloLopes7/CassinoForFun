/**
 * Economia DBET — toda movimentacao de saldo passa por aqui.
 * - Saldos em centavos (inteiros), ledger auditavel em Transaction.
 * - Usa transacoes Mongo quando disponivel (replica set); fallback direto caso contrario.
 */
const mongoose = require('mongoose');
const { User, Transaction } = require('../models');

const xpForLevel = (level) => 50 * level * (level + 1); // xp total p/ concluir o nivel
const levelFromXp = (xp) => {
  let level = 1;
  while (xp >= xpForLevel(level)) level += 1;
  return level;
};

let transactionsSupported = null;
async function probeTransactions() {
  if (transactionsSupported !== null) return transactionsSupported;
  try {
    await mongoose.connection.db.command({ replSetGetStatus: 1 });
    transactionsSupported = true;
  } catch {
    transactionsSupported = false;
  }
  return transactionsSupported;
}

async function withOptionalSession(fn) {
  if (await probeTransactions()) {
    const session = await mongoose.startSession();
    try {
      let out;
      await session.withTransaction(async () => {
        out = await fn(session);
      });
      return out;
    } finally {
      session.endSession();
    }
  }
  return fn(null);
}

/** Debita saldo; falha com Error('insufficient_funds') se nao houver saldo. */
async function chargeUser(userId, amountCents, { type = 'bet', game = '', meta = {}, awardXp = true } = {}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('invalid_amount');
  return withOptionalSession(async (session) => {
    const user = await User.findOneAndUpdate(
      { _id: userId, balance: { $gte: amountCents }, banned: false },
      {
        $inc: {
          balance: -amountCents,
          'stats.bets': type === 'bet' || type === 'sport_bet' ? 1 : 0,
          'stats.wagered': type === 'bet' || type === 'sport_bet' ? amountCents : 0,
          xp: awardXp && (type === 'bet' || type === 'sport_bet') ? Math.max(1, Math.floor(amountCents / 100)) : 0,
        },
      },
      { new: true, session }
    );
    if (!user) throw new Error('insufficient_funds');

    const newLevel = levelFromXp(user.xp);
    if (newLevel !== user.level) {
      user.level = newLevel;
      await user.save({ session });
      // Milestone de referral: indicado chegou ao nivel 5 -> paga o indicador (1x)
      if (newLevel >= 5 && user.referredBy) {
        const paid = await Transaction.findOne({ type: 'referral', 'meta.referred': user._id }).session(session);
        if (!paid) {
          await creditUser(user.referredBy, 50_000, {
            type: 'referral',
            meta: { referred: user._id, level: newLevel },
          });
        }
      }
    }

    await Transaction.create(
      [
        {
          user: userId,
          type,
          amount: -amountCents,
          balanceAfter: user.balance,
          game,
          meta,
        },
      ],
      { session }
    );
    return user;
  });
}

/** Credita saldo (vitorias, bonus, reembolsos). */
async function creditUser(userId, amountCents, { type = 'win', game = '', meta = {} } = {}) {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error('invalid_amount');
  if (amountCents === 0) return User.findById(userId);
  return withOptionalSession(async (session) => {
    const inc = {
      balance: amountCents,
      ...(type === 'win' || type === 'sport_win'
        ? {
            'stats.won': amountCents,
            'stats.biggestWin': 0, // ajustado abaixo
          }
        : {}),
    };
    const user = await User.findByIdAndUpdate(userId, { $inc: inc }, { new: true, session });
    if (type === 'win' || type === 'sport_win') {
      if (amountCents > user.stats.biggestWin) {
        user.stats.biggestWin = amountCents;
        await user.save({ session });
      }
    }
    await Transaction.create(
      [{ user: userId, type, amount: amountCents, balanceAfter: user.balance, game, meta }],
      { session }
    );
    return user;
  });
}

const STARTING_BALANCE = 1_000_000; // R$ 10.000,00 ficticios
const MIN_BET = 100; // R$ 1,00
const MAX_BET = 10_000_000; // R$ 100.000,00

/** Auto-recarga de seguranca: saldo zerado recebe fichas de recarga. */
const SAFETY_NET_AMOUNT = 50_000; // R$ 500,00
const SAFETY_NET_COOLDOWN_MS = 60 * 60 * 1000; // 1h

module.exports = {
  chargeUser,
  creditUser,
  levelFromXp,
  xpForLevel,
  STARTING_BALANCE,
  MIN_BET,
  MAX_BET,
  SAFETY_NET_AMOUNT,
  SAFETY_NET_COOLDOWN_MS,
};
