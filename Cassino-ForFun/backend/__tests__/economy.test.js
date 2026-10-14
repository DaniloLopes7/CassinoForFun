/**
 * Testes de economia e engines com banco em memoria.
 * Usa node --experimental-vm-modules? Nao: mongodb-memory-server com JS puro.
 */
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

jest.setTimeout(120000);

let replset;
beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(replset.getUri('dbet-test'));
});
afterAll(async () => {
  await mongoose.disconnect();
  await replset.stop();
});

const { User, Transaction } = require('../models');
const economy = require('../utils/economy');
const games = require('../games/solo');

async function freshUser(balance = 100_000) {
  return User.create({
    username: 'u' + Math.random().toString(36).slice(2, 8),
    email: Math.random().toString(36).slice(2, 8) + '@dbet.app',
    passwordHash: 'x',
    balance,
  });
}

describe('economy', () => {
  test('credito e debito com ledger', async () => {
    const u = await freshUser(10_000);
    await economy.chargeUser(u._id, 3_000, { game: 'dice' });
    await economy.creditUser(u._id, 4_500, { game: 'dice' });
    const after = await User.findById(u._id);
    expect(after.balance).toBe(11_500);
    const txs = await Transaction.find({ user: u._id });
    expect(txs).toHaveLength(2);
    expect(txs[1].balanceAfter).toBe(11_500);
  });

  test('saldo insuficiente falha', async () => {
    const u = await freshUser(100);
    await expect(economy.chargeUser(u._id, 200)).rejects.toThrow('insufficient_funds');
  });

  test('xp acumula e sobe nivel', async () => {
    const u = await freshUser(1_000_000);
    await economy.chargeUser(u._id, 20_000, { game: 'dice' }); // +200xp
    await economy.chargeUser(u._id, 30_000, { game: 'dice' }); // +300xp = 500
    const after = await User.findById(u._id);
    expect(after.xp).toBe(500);
    expect(after.level).toBeGreaterThan(1);
  });
});

describe('engines solo', () => {
  test('dice over/under', async () => {
    const u = await freshUser();
    const res = await games.playDice(u, 500, { target: 50, direction: 'over' });
    expect(res.bet).toBe(500);
    expect(res.roll).toBeGreaterThanOrEqual(0);
    expect(res.roll).toBeLessThan(100);
    const after = await User.findById(u._id);
    if (res.win) {
      expect(res.payout).toBe(Math.floor(500 * res.multiplier));
      expect(after.balance).toBe(100_000 - 500 + res.payout);
    } else {
      expect(after.balance).toBe(99_500);
    }
  });

  test('mines: bust encerra; cashout paga', async () => {
    const u = await freshUser();
    const start = await games.minesStart(u, 500, { mines: 3 });
    expect(start.mineCount).toBe(3);

    // revela ate estourar ou cashout
    let result;
    for (let tile = 0; tile < 25; tile++) {
      try {
        result = await games.minesAction(u, start.sessionId, 'reveal', { tile });
        if (result.busted) break;
        if (result.revealed.length === 2) {
          result = await games.minesAction(u, start.sessionId, 'cashout');
          break;
        }
      } catch {
        break;
      }
    }
    expect(result).toBeDefined();
    if (result.cashout) expect(result.payout).toBeGreaterThan(0);
  });

  test('blackjack: deal devolve mao valida', async () => {
    const u = await freshUser();
    const res = await games.blackjackDeal(u, 500);
    expect(res.sessionId).toBeDefined();
    if (!res.finished) {
      expect(res.hands[0]).toHaveLength(2);
      expect(res.dealerUp).toBeDefined();
    }
  });

  test('slot retorna 3 simbolos e payout coerente', async () => {
    const u = await freshUser();
    const res = await games.playSlots(u, 500);
    expect(res.reels).toHaveLength(3);
    if (res.multiplier > 0) expect(res.payout).toBe(Math.floor(500 * res.multiplier));
    else expect(res.payout).toBe(0);
  });

  test('hilo: start + guess + cashout', async () => {
    const u = await freshUser();
    const start = await games.hiloStart(u, 500);
    expect(start.rank).toBeGreaterThanOrEqual(1);
    // forca vitoria seguindo probs favoraveis
    const dir = start.probs.higher >= start.probs.lower ? 'higher' : 'lower';
    const guess = await games.hiloGuess(u, start.sessionId, dir);
    if (guess.win) {
      const co = await games.hiloCashout(u, start.sessionId);
      expect(co.payout).toBeGreaterThan(500);
    }
  });

  test('plinko: retorna path/bin/table coerentes', async () => {
    const u = await freshUser();
    const res = await games.playPlinko(u, 500, { rows: 12 });
    expect(res.path).toHaveLength(12);
    expect(res.bin).toBe(res.path.reduce((a, b) => a + b, 0));
    expect(res.table).toHaveLength(13);
    expect(res.payout).toBe(Math.floor(500 * res.table[res.bin]));
  });
});
