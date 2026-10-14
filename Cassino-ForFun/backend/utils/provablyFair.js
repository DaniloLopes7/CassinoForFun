/**
 * DBET Provably Fair
 * -------------------
 * Cada usuario possui:
 *  - serverSeed  : segredo do servidor (revelado ao rotacionar)
 *  - serverSeedHash : sha256(serverSeed) — publicado antes das apostas (commitment)
 *  - clientSeed  : editavel pelo usuario
 *  - nonce       : incrementa a cada aposta
 *
 * Sorteio: HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${cursor}`)
 * Os 52 primeiros bits do digest viram um float uniforme em [0, 1).
 * Para multiplos sorteios na mesma aposta, incrementa-se o cursor.
 *
 * Qualquer um pode verificar no front (pagina /fair) reproduzindo o HMAC.
 */
const crypto = require('crypto');

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function randomServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/** Float uniforme em [0,1) com 52 bits de entropia. */
function fairFloat(serverSeed, clientSeed, nonce, cursor = 0) {
  const hmac = crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}:${cursor}`)
    .digest('hex');
  // 13 chars hex = 52 bits
  const value = parseInt(hmac.slice(0, 13), 16);
  return value / Math.pow(2, 52);
}

/** Inteiro uniforme em [0, maxExclusive). */
function fairInt(serverSeed, clientSeed, nonce, cursor, maxExclusive) {
  return Math.floor(fairFloat(serverSeed, clientSeed, nonce, cursor) * maxExclusive);
}

/** Embaralhamento Fisher-Yates determinístico para sapato de cartas. */
function fairShuffle(serverSeed, clientSeed, nonce, size) {
  const arr = Array.from({ length: size }, (_, i) => i);
  for (let i = size - 1; i > 0; i--) {
    const j = fairInt(serverSeed, clientSeed, nonce, i, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = { sha256, randomServerSeed, fairFloat, fairInt, fairShuffle };
