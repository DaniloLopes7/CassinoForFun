const { User } = require('../models');
const pf = require('./provablyFair');

/**
 * RNG vinculado ao par de seeds do usuario.
 * Reserva o nonce atomicamente (1 por aposta) e sorteia com cursor incremental.
 */
class BetRNG {
  constructor(serverSeed, clientSeed, nonce) {
    this.serverSeed = serverSeed;
    this.clientSeed = clientSeed;
    this.nonce = nonce;
    this.cursor = 0;
  }
  float() {
    const v = pf.fairFloat(this.serverSeed, this.clientSeed, this.nonce, this.cursor);
    this.cursor += 1;
    return v;
  }
  int(maxExclusive) {
    return Math.floor(this.float() * maxExclusive);
  }
  shuffle(size) {
    const arr = Array.from({ length: size }, (_, i) => i);
    for (let i = size - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  proof() {
    return { serverSeedHash: pf.sha256(this.serverSeed), clientSeed: this.clientSeed, nonce: this.nonce };
  }
}

/** Garante seed inicial e reserva o proximo nonce do usuario. */
async function nextRngFor(user, clientSeedOverride) {
  if (!user.serverSeed) {
    user.serverSeed = pf.randomServerSeed();
    user.serverSeedHash = pf.sha256(user.serverSeed);
    if (!user.clientSeed) user.clientSeed = pf.randomServerSeed().slice(0, 16);
  }
  if (clientSeedOverride && clientSeedOverride !== user.clientSeed) {
    user.clientSeed = String(clientSeedOverride).slice(0, 64);
  }
  user.nonce += 1;
  await user.save();
  return new BetRNG(user.serverSeed, user.clientSeed, user.nonce - 1);
}

module.exports = { BetRNG, nextRngFor };
