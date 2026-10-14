const m = require('../games/math');
const pf = require('../utils/provablyFair');

describe('provably fair', () => {
  const serverSeed = 'a'.repeat(64);
  const clientSeed = 'client123';

  test('floats sao deterministicos e em [0,1)', () => {
    const f1 = pf.fairFloat(serverSeed, clientSeed, 5, 0);
    const f2 = pf.fairFloat(serverSeed, clientSeed, 5, 0);
    expect(f1).toBe(f2);
    expect(f1).toBeGreaterThanOrEqual(0);
    expect(f1).toBeLessThan(1);
  });

  test('nonce/cursor diferentes dao resultados diferentes', () => {
    expect(pf.fairFloat(serverSeed, clientSeed, 1, 0)).not.toBe(pf.fairFloat(serverSeed, clientSeed, 2, 0));
    expect(pf.fairFloat(serverSeed, clientSeed, 1, 0)).not.toBe(pf.fairFloat(serverSeed, clientSeed, 1, 1));
  });

  test('commitment: sha256 bate com a seed', () => {
    expect(pf.sha256(serverSeed)).toHaveLength(64);
  });

  test('shuffle permuta todos os indices', () => {
    const out = pf.fairShuffle(serverSeed, clientSeed, 1, 52);
    expect(out.sort((a, b) => a - b)).toEqual(Array.from({ length: 52 }, (_, i) => i));
  });
});

describe('crash', () => {
  test('crash point >= 1 e cap em 1000', () => {
    expect(m.crashPointFromFloat(0)).toBeGreaterThanOrEqual(1);
    expect(m.crashPointFromFloat(0.999999)).toBeLessThanOrEqual(1000);
    for (const r of [0.1, 0.5, 0.9]) {
      expect(m.crashPointFromFloat(r)).toBeGreaterThanOrEqual(1);
    }
  });
  test('house edge: media geometrica < fair', () => {
    // P(crash >= 2) deveria ser ~48.5% (edge 3%)
    let count = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const r = pf.fairFloat('seed' + i, 'c', 0, 0);
      if (m.crashPointFromFloat(r) >= 2) count++;
    }
    const prob = count / N;
    expect(prob).toBeGreaterThan(0.45);
    expect(prob).toBeLessThan(0.5);
  });
});

describe('dice', () => {
  test('multiplicador = 99/chance', () => {
    expect(m.diceMultiplier(50)).toBe(1.98);
    expect(m.diceMultiplier(10)).toBe(9.9);
  });
});

describe('mines', () => {
  test('multiplicador cresce com reveals', () => {
    const m1 = m.minesMultiplier(3, 1);
    const m2 = m.minesMultiplier(3, 2);
    const m3 = m.minesMultiplier(3, 5);
    expect(m1).toBeGreaterThan(1);
    expect(m2).toBeGreaterThan(m1);
    expect(m3).toBeGreaterThan(m2);
  });
  test('mais minas = multiplicador maior', () => {
    expect(m.minesMultiplier(10, 3)).toBeGreaterThan(m.minesMultiplier(1, 3));
  });
});

describe('hilo', () => {
  test('prob de higher em A = 12/13; em K = 0', () => {
    expect(m.hiloWinProb(1, 'higher')).toBeCloseTo(12 / 13);
    expect(m.hiloWinProb(13, 'higher')).toBe(0);
    expect(m.hiloWinProb(13, 'lower')).toBeCloseTo(12 / 13);
  });
});

describe('blackjack', () => {
  test('valores: ases flexiveis', () => {
    expect(m.handValue(['A♠', 'K♥'])).toBe(21);
    expect(m.handValue(['A♠', '9♥', 'A♦'])).toBe(21);
    expect(m.handValue(['K♠', '9♥', '5♦'])).toBe(24);
    expect(m.isBlackjack(['A♠', 'K♥'])).toBe(true);
    expect(m.isBust(['K♠', '9♥', '5♦'])).toBe(true);
  });
  test('shoe tem 208 cartas (4 baralhos)', () => {
    expect(m.buildShoe(4)).toHaveLength(208);
  });
});

describe('plinko', () => {
  test('tabela simetrica e dentro dos caps', () => {
    const t12 = m.plinkoTable(12);
    expect(t12).toHaveLength(13);
    expect(t12[0]).toBe(t12[12]);
    for (const v of t12) {
      expect(v).toBeGreaterThanOrEqual(0.2);
      expect(v).toBeLessThanOrEqual(120);
    }
  });
});

describe('slot', () => {
  test('paytable: 777 = 50x; duas cerejas = 1.5x', () => {
    expect(m.slotPayout(['7️⃣', '7️⃣', '7️⃣'])).toBe(50);
    expect(m.slotPayout(['🍒', '🍋', '🍒'])).toBe(1.5);
    expect(m.slotPayout(['🍋', '🔔', '⭐'])).toBe(0);
  });
});
