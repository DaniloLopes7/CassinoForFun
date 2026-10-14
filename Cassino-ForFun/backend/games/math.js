/**
 * Matematica dos jogos DBET (pura, sem IO) — multiplicadores com house edge.
 * Todos os multiplicadores retornam "por 1" (ex: 1.98x).
 * Valores auxiliares em centavos quando aplicavel.
 */

// ---------- CRASH ----------
const CRASH_EDGE = 0.03;
function crashPointFromFloat(r) {
  // r ~ [0,1). P(crash >= m) = (1-edge)/m
  const point = Math.floor(((1 - CRASH_EDGE) / (1 - Math.min(r, 0.999999999))) * 100) / 100;
  return Math.max(1, Math.min(point, 1000)); // cap 1000x
}
function crashGrowth(elapsedMs) {
  return Math.max(1, Math.exp(elapsedMs * 0.00009)); // ~2x a cada ~7.7s
}

// ---------- DICE ----------
const DICE_EDGE = 0.01;
function diceMultiplier(chancePct) {
  // chancePct: chance de vitoria em % (1..98)
  return Math.floor(((100 / chancePct) * (1 - DICE_EDGE)) * 10000) / 10000;
}

// ---------- MINES ----------
const MINES_EDGE = 0.01;
function comb(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
/** Multiplicador acumulado apos `revealed` casas seguras em grid 25 com `mines` minas. */
function minesMultiplier(mines, revealed, gridSize = 25) {
  if (revealed <= 0) return 1;
  const surviveProb = comb(gridSize - mines, revealed) / comb(gridSize, revealed);
  if (surviveProb <= 0) return 0;
  return Math.floor(((1 - MINES_EDGE) / surviveProb) * 100) / 100;
}

// ---------- HILO ----------
const HILO_EDGE = 0.02;
// rank 1..13 (A..K). Retorna probabilidade de acerto para direcao.
function hiloWinProb(rank, direction) {
  if (direction === 'higher') return (13 - rank) / 13;
  if (direction === 'lower') return (rank - 1) / 13;
  return 0;
}
function hiloStepMultiplier(prob) {
  if (prob <= 0) return 0;
  return Math.floor(((1 - HILO_EDGE) / prob) * 10000) / 10000;
}

// ---------- BLACKJACK ----------
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function buildShoe(deckCount = 4) {
  const shoe = [];
  for (let d = 0; d < deckCount; d++) {
    for (const s of SUITS) for (const r of RANKS) shoe.push(r + s);
  }
  return shoe;
}
function cardValue(card) {
  const rank = card.slice(0, -1);
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}
function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.startsWith('A')) aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}
const isBlackjack = (cards) => cards.length === 2 && handValue(cards) === 21;
const isBust = (cards) => handValue(cards) > 21;

// ---------- SLOT ----------
// 3 rolos; simbolos com pesos; paytable na linha central.
const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
const SLOT_WEIGHTS = [30, 26, 20, 14, 7, 3]; // total 100
const SLOT_PAYTABLE = {
  // tres iguais
  '7️⃣7️⃣7️⃣': 50,
  '💎💎💎': 25,
  '⭐⭐⭐': 12,
  '🔔🔔🔔': 8,
  '🍋🍋🍋': 5,
  '🍒🍒🍒': 4,
};
const SLOT_TWO_CHERRY = 1.5; // duas cerejas quaisquer
function spinReels(draw) {
  // draw(cursor) -> float [0,1)
  const total = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
  const reels = [];
  for (let i = 0; i < 3; i++) {
    let roll = draw(i) * total;
    let idx = 0;
    while (roll >= SLOT_WEIGHTS[idx]) {
      roll -= SLOT_WEIGHTS[idx];
      idx++;
    }
    reels.push(SLOT_SYMBOLS[idx]);
  }
  return reels;
}
function slotPayout(reels) {
  const key = reels.join('');
  if (SLOT_PAYTABLE[key]) return SLOT_PAYTABLE[key];
  const cherries = reels.filter((r) => r === '🍒').length;
  if (cherries === 2) return SLOT_TWO_CHERRY;
  return 0;
}

// ---------- PLINKO ----------
const PLINKO_EDGE = 0.03;
const PLINKO_MAX_MULT = 120;
const PLINKO_MIN_MULT = 0.2;
/** Tabela de multiplicadores para `rows` linhas. Bin k de n. */
function plinkoTable(rows) {
  const table = [];
  for (let k = 0; k <= rows; k++) {
    const p = comb(rows, k) / Math.pow(2, rows);
    let mult = ((1 - PLINKO_EDGE) / p) * 0.42; // fator de variancia p/ eSports-like feel
    mult = Math.min(PLINKO_MAX_MULT, Math.max(PLINKO_MIN_MULT, mult));
    table.push(Math.round(mult * 100) / 100);
  }
  return table;
}

// ---------- COINFLIP ----------
const COINFLIP_EDGE = 0.02;
const COINFLIP_MULT = 2 * (1 - COINFLIP_EDGE); // 1.96x

module.exports = {
  CRASH_EDGE,
  crashPointFromFloat,
  crashGrowth,
  DICE_EDGE,
  diceMultiplier,
  MINES_EDGE,
  minesMultiplier,
  HILO_EDGE,
  HILO_RANK_MAX: 13,
  hiloWinProb,
  hiloStepMultiplier,
  SUITS,
  RANKS,
  buildShoe,
  cardValue,
  handValue,
  isBlackjack,
  isBust,
  SLOT_SYMBOLS,
  SLOT_PAYTABLE,
  spinReels,
  slotPayout,
  PLINKO_EDGE,
  plinkoTable,
  COINFLIP_EDGE,
  COINFLIP_MULT,
};
