/**
 * Jogos ao vivo (multiplayer) via Socket.IO: Crash e Coinflip.
 * Rounds globais com seeds em cadeia (hash chain) — verificavel.
 */
const crypto = require('crypto');
const m = require('./math');
const { chargeUser, creditUser, MIN_BET, MAX_BET } = require('../utils/economy');
const { LiveRound, User } = require('../models');

// ------------------------- CRASH -------------------------
const BETTING_MS = 7000;
const TICK_MS = 80;

function createCrashGame(io, online) {
  const state = {
    status: 'betting', // betting | running | crashed
    roundId: 0,
    serverSeed: crypto.randomBytes(32).toString('hex'),
    prevSeedHash: 'dbet-genesis',
    crashPoint: 1,
    multiplier: 1,
    bets: new Map(), // userId -> {username, bet, cashedAt, payout}
    history: [],
    bettingEndsAt: Date.now() + BETTING_MS,
    startedAt: null,
    timer: null,
    seedHash: '',
  };

  function publicState() {
    return {
      game: 'crash',
      status: state.status,
      roundId: state.roundId,
      multiplier: state.multiplier,
      crashPoint: state.status === 'crashed' ? state.crashPoint : undefined,
      bettingEndsAt: state.bettingEndsAt,
      seedHash: state.seedHash,
      history: state.history.slice(0, 15),
      bets: [...state.bets.entries()].map(([uid, b]) => ({
        userId: uid,
        username: b.username,
        bet: b.bet,
        cashedAt: b.cashedAt,
        payout: b.payout,
      })),
    };
  }

  async function startRound() {
    state.roundId += 1;
    state.status = 'betting';
    state.multiplier = 1;
    state.bets = new Map();
    // hash chain: seed do round = sha256(seedAnterior + roundId)
    state.prevSeedHash = crypto.createHash('sha256').update(state.serverSeed).digest('hex');
    state.serverSeed = crypto
      .createHash('sha256')
      .update(state.prevSeedHash + ':' + state.roundId)
      .digest('hex');
    state.seedHash = crypto.createHash('sha256').update(state.serverSeed).digest('hex');
    const r = parseInt(crypto.createHmac('sha256', state.serverSeed).update('crash').digest('hex').slice(0, 13), 16) / Math.pow(2, 52);
    state.crashPoint = m.crashPointFromFloat(r);
    state.bettingEndsAt = Date.now() + BETTING_MS;
    io.emit('crash:state', publicState());
    state.timer = setTimeout(runRound, BETTING_MS);
  }

  function runRound() {
    state.status = 'running';
    state.startedAt = Date.now();
    io.emit('crash:state', publicState());

    const tick = () => {
      const elapsed = Date.now() - state.startedAt;
      state.multiplier = Math.floor(m.crashGrowth(elapsed) * 100) / 100;
      if (state.multiplier >= state.crashPoint) {
        state.multiplier = state.crashPoint;
        return crashNow();
      }
      io.emit('crash:tick', { multiplier: state.multiplier, roundId: state.roundId });
      state.timer = setTimeout(tick, TICK_MS);
    };
    state.timer = setTimeout(tick, TICK_MS);
  }

  async function crashNow() {
    state.status = 'crashed';
    io.emit('crash:state', publicState());

    // Persiste resultado p/ historico verificavel
    const losers = [...state.bets.values()];
    for (const b of losers) {
      if (!b.cashedAt) b.payout = 0;
    }
    LiveRound.create({
      game: 'crash',
      roundId: state.roundId,
      result: { crashPoint: state.crashPoint },
      serverSeedHash: state.seedHash,
      serverSeed: state.serverSeed,
    }).catch(() => {});

    state.history.unshift(state.crashPoint);
    state.history = state.history.slice(0, 30);
    state.timer = setTimeout(startRound, 3000);
  }

  async function placeBet(user, amount) {
    if (state.status !== 'betting') throw new Error('betting_closed');
    const bet = Math.floor(Number(amount));
    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) throw new Error('invalid_bet');
    if (state.bets.has(user._id.toString())) throw new Error('already_bet');
    await chargeUser(user._id, bet, { game: 'crash', meta: { roundId: state.roundId } });
    state.bets.set(user._id.toString(), { username: user.username, bet, cashedAt: null, payout: null });
    io.emit('crash:state', publicState());
    return publicState();
  }

  async function cashout(user) {
    const entry = state.bets.get(user._id.toString());
    if (!entry) throw new Error('no_bet');
    if (state.status !== 'running') throw new Error('not_running');
    if (entry.cashedAt) throw new Error('already_cashed');
    const mult = state.multiplier;
    entry.cashedAt = mult;
    entry.payout = Math.floor(entry.bet * mult);
    await creditUser(user._id, entry.payout, {
      type: 'win',
      game: 'crash',
      meta: { roundId: state.roundId, multiplier: mult },
    });
    io.emit('crash:state', publicState());
    return { cashedAt: mult, payout: entry.payout };
  }

  startRound();
  return { publicState, placeBet, cashout };
}

// ------------------------- COINFLIP -------------------------
function createCoinflip(io) {
  const open = new Map(); // id -> lobby
  let counter = 0;

  function listOpen() {
    return [...open.values()].map((l) => ({
      id: l.id,
      username: l.creator.username,
      bet: l.bet,
      side: l.side,
      createdAt: l.createdAt,
    }));
  }

  async function create(user, betAmount, side) {
    const bet = Math.floor(Number(betAmount));
    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) throw new Error('invalid_bet');
    if (!['heads', 'tails'].includes(side)) throw new Error('invalid_side');
    for (const l of open.values()) {
      if (l.creator._id.toString() === user._id.toString()) throw new Error('already_open');
    }
    await chargeUser(user._id, bet, { game: 'coinflip', meta: { lobby: true } });
    counter += 1;
    const lobby = { id: `cf${counter}`, creator: user, bet, side, createdAt: new Date() };
    open.set(lobby.id, lobby);
    io.emit('coinflip:lobbies', listOpen());
    return lobby;
  }

  async function join(user, lobbyId) {
    const lobby = open.get(lobbyId);
    if (!lobby) throw new Error('lobby_not_found');
    if (lobby.creator._id.toString() === user._id.toString()) throw new Error('own_lobby');
    await chargeUser(user._id, lobby.bet, { game: 'coinflip', meta: { lobby: lobbyId } });
    open.delete(lobbyId);

    // sorteio: hash chain publica do servidor
    const seed = crypto.randomBytes(32).toString('hex');
    const r = parseInt(crypto.createHmac('sha256', seed).update(`${lobbyId}`).digest('hex').slice(0, 13), 16) / Math.pow(2, 52);
    const flip = r < 0.5 ? 'heads' : 'tails';
    const winner = flip === lobby.side ? lobby.creator : user;
    const loser = flip === lobby.side ? user : lobby.creator;
    const pot = lobby.bet * 2;
    const payout = Math.floor(pot * (1 - m.COINFLIP_EDGE));
    await creditUser(winner._id, payout, {
      type: 'win',
      game: 'coinflip',
      meta: { lobby: lobbyId, flip },
    });

    const result = {
      lobbyId,
      flip,
      winner: { id: winner._id, username: winner.username },
      loser: { id: loser._id, username: loser.username },
      bet: lobby.bet,
      payout,
      serverSeedHash: crypto.createHash('sha256').update(seed).digest('hex'),
      serverSeed: seed,
    };
    io.emit('coinflip:result', result);
    io.emit('coinflip:lobbies', listOpen());
    LiveRound.create({ game: 'coinflip', roundId: counter, result, serverSeedHash: result.serverSeedHash, serverSeed: seed }).catch(() => {});
    return result;
  }

  async function cancel(user, lobbyId) {
    const lobby = open.get(lobbyId);
    if (!lobby || lobby.creator._id.toString() !== user._id.toString()) throw new Error('lobby_not_found');
    open.delete(lobbyId);
    await creditUser(user._id, lobby.bet, { type: 'refund', game: 'coinflip', meta: { lobby: lobbyId } });
    io.emit('coinflip:lobbies', listOpen());
    return { cancelled: true };
  }

  return { listOpen, create, join, cancel };
}

module.exports = { createCrashGame, createCoinflip };
