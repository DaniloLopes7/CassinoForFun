/**
 * Motores dos jogos solo DBET: slot, dice, plinko, mines, hilo, blackjack.
 * Toda logica e server-side; o front apenas envia a intencao de aposta.
 */
const { chargeUser, creditUser, MIN_BET, MAX_BET } = require('../utils/economy');
const { nextRngFor } = require('../utils/rng');
const { GameSession } = require('../models');
const m = require('./math');

function validateBet(bet) {
  const b = Math.floor(Number(bet));
  if (!Number.isFinite(b) || b < MIN_BET || b > MAX_BET) throw new Error('invalid_bet');
  return b;
}

function round2(x) {
  return Math.round(x * 100) / 100;
}

// ---------------------------------------------------------------- SLOT
async function playSlots(user, betAmount, clientSeed) {
  const bet = validateBet(betAmount);
  const rng = await nextRngFor(user, clientSeed);
  await chargeUser(user._id, bet, { game: 'slot', meta: rng.proof() });

  const reels = m.spinReels(() => rng.float());
  const multiplier = m.slotPayout(reels);
  const payout = Math.floor(bet * multiplier);
  if (payout > 0) {
    await creditUser(user._id, payout, { type: 'win', game: 'slot', meta: { ...rng.proof(), multiplier } });
  }
  return { ...rng.proof(), bet, reels, multiplier, payout };
}

// ---------------------------------------------------------------- DICE
async function playDice(user, betAmount, { target, direction }, clientSeed) {
  const bet = validateBet(betAmount);
  const t = Number(target);
  if (!['over', 'under'].includes(direction) || !(t > 0 && t < 100)) throw new Error('invalid_params');
  const chance = direction === 'over' ? 100 - t : t;
  if (chance < 1 || chance > 98) throw new Error('invalid_params');

  const rng = await nextRngFor(user, clientSeed);
  await chargeUser(user._id, bet, { game: 'dice', meta: rng.proof() });

  const roll = round2(rng.float() * 100);
  const win = direction === 'over' ? roll > t : roll < t;
  const multiplier = win ? m.diceMultiplier(chance) : 0;
  const payout = Math.floor(bet * multiplier);
  if (payout > 0) {
    await creditUser(user._id, payout, { type: 'win', game: 'dice', meta: { ...rng.proof(), multiplier } });
  }
  return { ...rng.proof(), bet, roll, win, multiplier, payout, target: t, direction, chance };
}

// ---------------------------------------------------------------- PLINKO
async function playPlinko(user, betAmount, { rows = 12 }, clientSeed) {
  const bet = validateBet(betAmount);
  const r = Math.min(16, Math.max(8, parseInt(rows, 10) || 12));
  const rng = await nextRngFor(user, clientSeed);
  await chargeUser(user._id, bet, { game: 'plinko', meta: rng.proof() });

  const path = [];
  let bin = 0;
  for (let i = 0; i < r; i++) {
    const right = rng.float() >= 0.5;
    path.push(right ? 1 : 0);
    if (right) bin += 1;
  }
  const table = m.plinkoTable(r);
  const multiplier = table[bin];
  const payout = Math.floor(bet * multiplier);
  if (payout > 0) {
    await creditUser(user._id, payout, { type: 'win', game: 'plinko', meta: { ...rng.proof(), multiplier } });
  }
  return { ...rng.proof(), bet, rows: r, path, bin, multiplier, payout, table };
}

// ---------------------------------------------------------------- MINES
const MINES_GRID = 25;

async function minesStart(user, betAmount, { mines }, clientSeed) {
  const bet = validateBet(betAmount);
  const mineCount = Math.min(24, Math.max(1, parseInt(mines, 10) || 3));
  const rng = await nextRngFor(user, clientSeed);
  await chargeUser(user._id, bet, { game: 'mines', meta: rng.proof() });

  const order = rng.shuffle(MINES_GRID); // as primeiras `mineCount` posicoes sao minas
  const minePositions = order.slice(0, mineCount);
  const session = await GameSession.create({
    user: user._id,
    game: 'mines',
    bet,
    nonce: rng.nonce,
    serverSeedHash: rng.proof().serverSeedHash,
    state: { mines: minePositions, mineCount, revealed: [], clientSeed: rng.clientSeed },
  });
  return { sessionId: session._id, bet, mineCount, revealed: [], multiplier: 1 };
}

async function minesAction(user, sessionId, action, payload = {}) {
  const session = await GameSession.findOne({ _id: sessionId, user: user._id, game: 'mines' });
  if (!session || session.status !== 'active') throw new Error('session_not_found');
  const { mines, mineCount, revealed } = session.state;

  if (action === 'reveal') {
    const tile = parseInt(payload.tile, 10);
    if (!(tile >= 0 && tile < MINES_GRID) || revealed.includes(tile)) throw new Error('invalid_tile');
    if (mines.includes(tile)) {
      session.state.revealed = [...revealed, tile];
      session.state.busted = true;
      session.status = 'done';
      await session.save();
      return { busted: true, tile, minePositions: mines, revealed: session.state.revealed, payout: 0, sessionId };
    }
    const newRevealed = [...revealed, tile];
    const multiplier = m.minesMultiplier(mineCount, newRevealed.length);
    session.state.revealed = newRevealed;
    // auto-cashout se nao restam casas seguras
    if (newRevealed.length + mineCount >= MINES_GRID) {
      return minesCashoutSession(session, user, multiplier);
    }
    await session.save();
    return { busted: false, tile, revealed: newRevealed, multiplier, nextPayout: Math.floor(session.bet * multiplier), sessionId };
  }

  if (action === 'cashout') {
    if (revealed.length === 0) throw new Error('nothing_to_cashout');
    const multiplier = m.minesMultiplier(mineCount, revealed.length);
    return minesCashoutSession(session, user, multiplier);
  }
  throw new Error('invalid_action');
}

async function minesCashoutSession(session, user, multiplier) {
  const payout = Math.floor(session.bet * multiplier);
  session.status = 'done';
  session.state.cashout = true;
  session.state.finalMultiplier = multiplier;
  await session.save();
  await creditUser(user._id, payout, { type: 'win', game: 'mines', meta: { multiplier, session: session._id } });
  return { busted: false, cashout: true, revealed: session.state.revealed, multiplier, payout, minePositions: session.state.mines, sessionId: session._id };
}

// ---------------------------------------------------------------- HILO
async function hiloStart(user, betAmount, clientSeed) {
  const bet = validateBet(betAmount);
  const rng = await nextRngFor(user, clientSeed);
  await chargeUser(user._id, bet, { game: 'hilo', meta: rng.proof() });

  // "Baralho infinito": cada carta e sorteada pelo cursor determinístico da seed
  const rank = rng.int(13) + 1; // cursor 0
  const session = await GameSession.create({
    user: user._id,
    game: 'hilo',
    bet,
    nonce: rng.nonce,
    serverSeedHash: rng.proof().serverSeedHash,
    state: { rank, multiplier: 1, streak: 0, clientSeed: rng.clientSeed, cursor: rng.cursor },
  });
  return {
    sessionId: session._id,
    bet,
    rank,
    probs: { higher: m.hiloWinProb(rank, 'higher'), lower: m.hiloWinProb(rank, 'lower') },
    multiplier: 1,
  };
}

function hiloDraw(user, session) {
  // proxima carta deterministica: fairInt(serverSeed, clientSeed, nonce, cursor)
  const pf = require('../utils/provablyFair');
  const next = pf.fairInt(user.serverSeed, session.state.clientSeed, session.nonce, session.state.cursor, 13) + 1;
  session.state.cursor += 1;
  session.state.rank = next;
  return next;
}

async function hiloGuess(user, sessionId, direction) {
  const session = await GameSession.findOne({ _id: sessionId, user: user._id, game: 'hilo' });
  if (!session || session.status !== 'active') throw new Error('session_not_found');
  if (!['higher', 'lower'].includes(direction)) throw new Error('invalid_params');

  const prevRank = session.state.rank;
  const prob = m.hiloWinProb(prevRank, direction);
  if (prob <= 0) throw new Error('invalid_guess'); // ex: carta K e apostou higher

  const nextRank = hiloDraw(user, session);
  const win = direction === 'higher' ? nextRank > prevRank : nextRank < prevRank;

  if (!win) {
    session.status = 'done';
    session.state.lostAt = nextRank;
    await session.save();
    return { win: false, prevRank, nextRank, multiplier: 0, payout: 0, sessionState: session.state, sessionId };
  }
  const stepMult = m.hiloStepMultiplier(prob);
  const multiplier = round2(session.state.multiplier * stepMult);
  session.state.multiplier = multiplier;
  session.state.streak += 1;
  await session.save();
  return {
    win: true,
    prevRank,
    nextRank,
    multiplier,
    streak: session.state.streak,
    probs: { higher: m.hiloWinProb(nextRank, 'higher'), lower: m.hiloWinProb(nextRank, 'lower') },
    sessionId,
  };
}

async function hiloCashout(user, sessionId) {
  const session = await GameSession.findOne({ _id: sessionId, user: user._id, game: 'hilo' });
  if (!session || session.status !== 'active') throw new Error('session_not_found');
  const multiplier = session.state.multiplier;
  if (multiplier <= 1 || session.state.streak === 0) throw new Error('nothing_to_cashout');
  const payout = Math.floor(session.bet * multiplier);
  session.status = 'done';
  await session.save();
  await creditUser(user._id, payout, { type: 'win', game: 'hilo', meta: { multiplier, session: session._id } });
  return { payout, multiplier, sessionId };
}

// ---------------------------------------------------------------- BLACKJACK
async function blackjackDeal(user, betAmount, clientSeed) {
  const bet = validateBet(betAmount);
  const rng = await nextRngFor(user, clientSeed);
  await chargeUser(user._id, bet, { game: 'blackjack', meta: rng.proof() });

  const shoeOrder = rng.shuffle(52 * 4);
  const fullShoe = m.buildShoe(4);
  const shoe = shoeOrder.map((i) => fullShoe[i]);

  const player = [shoe.pop(), shoe.pop()];
  const dealer = [shoe.pop(), shoe.pop()];

  const session = await GameSession.create({
    user: user._id,
    game: 'blackjack',
    bet,
    nonce: rng.nonce,
    serverSeedHash: rng.proof().serverSeedHash,
    state: {
      shoe,
      hands: [player],
      dealer,
      activeHand: 0,
      doubled: [false],
      finished: false,
      clientSeed: rng.clientSeed,
    },
  });

  // Dealer peek: se carta aberta e A ou 10-value e dealer tem BJ -> encerra
  const dealerBJ = m.isBlackjack(dealer);
  const playerBJ = m.isBlackjack(player);

  if (dealerBJ || playerBJ) {
    return blackjackSettle(session, user);
  }

  return {
    sessionId: session._id,
    bet,
    hands: [player],
    dealerUp: dealer[0],
    activeHand: 0,
    canDouble: true,
    canSplit: player[0].slice(0, -1) === player[1].slice(0, -1),
    values: [m.handValue(player)],
  };
}

async function blackjackAction(user, sessionId, action) {
  const session = await GameSession.findOne({ _id: sessionId, user: user._id, game: 'blackjack' });
  if (!session || session.status !== 'active') throw new Error('session_not_found');
  const s = session.state;
  const handIdx = s.activeHand;
  const hand = s.hands[handIdx];

  if (action === 'hit') {
    hand.push(s.shoe.pop());
    if (m.handValue(hand) >= 21) return blackjackAdvance(session, user);
  } else if (action === 'stand') {
    return blackjackAdvance(session, user);
  } else if (action === 'double') {
    if (hand.length !== 2 || s.doubled[handIdx]) throw new Error('invalid_action');
    await chargeUser(user._id, session.bet, { game: 'blackjack', meta: { session: session._id, double: true } });
    s.doubled[handIdx] = true;
    hand.push(s.shoe.pop());
    return blackjackAdvance(session, user);
  } else if (action === 'split') {
    if (s.hands.length !== 1 || hand.length !== 2) throw new Error('invalid_action');
    if (hand[0].slice(0, -1) !== hand[1].slice(0, -1)) throw new Error('invalid_action');
    await chargeUser(user._id, session.bet, { game: 'blackjack', meta: { session: session._id, split: true } });
    const c1 = hand[0];
    const c2 = hand[1];
    s.hands = [
      [c1, s.shoe.pop()],
      [c2, s.shoe.pop()],
    ];
    s.doubled = [false, false];
    s.activeHand = 0;
    session.markModified('state');
    await session.save();
    return blackJackStateResponse(session);
  } else {
    throw new Error('invalid_action');
  }

  session.markModified('state');
  await session.save();
  return blackJackStateResponse(session);
}

async function blackjackAdvance(session, user) {
  const s = session.state;
  // se estourou ou parou, proxima mao ou dealer
  if (s.activeHand + 1 < s.hands.length) {
    s.activeHand += 1;
    session.markModified('state');
    await session.save();
    return blackJackStateResponse(session);
  }
  return blackjackSettle(session, user);
}

async function blackjackSettle(session, user) {
  const s = session.state;
  // dealer joga ate 17
  while (m.handValue(s.dealer) < 17) s.dealer.push(s.shoe.pop());

  const dealerVal = m.handValue(s.dealer);
  const dealerBJ = m.isBlackjack(s.dealer);
  const results = [];
  let totalPayout = 0;

  for (let i = 0; i < s.hands.length; i++) {
    const hand = s.hands[i];
    const val = m.handValue(hand);
    const bet = session.bet * (s.doubled[i] ? 2 : 1);
    let payout = 0;
    let outcome = 'lost';
    if (m.isBust(hand)) {
      outcome = 'bust';
    } else if (m.isBlackjack(hand) && !dealerBJ) {
      payout = Math.floor(bet * 2.5);
      outcome = 'blackjack';
    } else if (dealerBJ && !m.isBlackjack(hand)) {
      outcome = 'lost';
    } else if (m.isBlackjack(hand) && dealerBJ) {
      payout = bet;
      outcome = 'push';
    } else if (m.isBust(s.dealer) || val > dealerVal) {
      payout = bet * 2;
      outcome = 'won';
    } else if (val === dealerVal) {
      payout = bet;
      outcome = 'push';
    }
    totalPayout += payout;
    results.push({ hand, value: val, outcome, payout });
  }

  session.status = 'done';
  s.finished = true;
  session.markModified('state');
  await session.save();

  if (totalPayout > 0) {
    await creditUser(user._id, totalPayout, { type: 'win', game: 'blackjack', meta: { session: session._id } });
  }

  return { sessionId: session._id, finished: true, results, dealer: s.dealer, dealerValue: dealerVal, payout: totalPayout };
}

function blackJackStateResponse(session) {
  const s = session.state;
  return {
    sessionId: session._id,
    bet: session.bet,
    hands: s.hands,
    dealerUp: s.dealer[0],
    activeHand: s.activeHand,
    values: s.hands.map(m.handValue),
    canDouble: s.hands[s.activeHand].length === 2,
    canSplit: false,
  };
}

module.exports = {
  playSlots,
  playDice,
  playPlinko,
  minesStart,
  minesAction,
  hiloStart,
  hiloGuess,
  hiloCashout,
  blackjackDeal,
  blackjackAction,
};
