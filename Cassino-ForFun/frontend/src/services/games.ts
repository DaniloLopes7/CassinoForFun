import { api } from './api';
import { playResult } from '../utils/sound';

// SFX global: toca win/lose conforme o resultado de qualquer jogo solo
function withSound<T extends { payout: number; bet: number; multiplier: number }>(p: Promise<T>): Promise<T> {
  return p.then((res) => {
    playResult(res.payout, res.bet ?? 0, res.multiplier);
    return res;
  });
}

export interface Proof {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface SlotResult extends Proof {
  bet: number;
  reels: string[];
  multiplier: number;
  payout: number;
}

export interface DiceResult extends Proof {
  bet: number;
  roll: number;
  win: boolean;
  multiplier: number;
  payout: number;
  target: number;
  direction: 'over' | 'under';
  chance: number;
}

export interface PlinkoResult extends Proof {
  bet: number;
  rows: number;
  path: number[];
  bin: number;
  multiplier: number;
  payout: number;
  table: number[];
}

export const games = {
  slots: (bet: number) => withSound(api.post<SlotResult>('/games/slots', { bet }).then((r) => r.data)),
  dice: (bet: number, target: number, direction: 'over' | 'under') =>
    withSound(api.post<DiceResult>('/games/dice', { bet, target, direction }).then((r) => r.data)),
  plinko: (bet: number, rows: number) =>
    withSound(api.post<PlinkoResult>('/games/plinko', { bet, rows }).then((r) => r.data)),

  minesStart: (bet: number, mines: number) => api.post('/games/mines/start', { bet, mines }).then((r) => r.data),
  minesReveal: (id: string, tile: number) => api.post(`/games/mines/${id}/reveal`, { tile }).then((r) => r.data),
  minesCashout: (id: string) => api.post(`/games/mines/${id}/cashout`).then((r) => r.data),

  hiloStart: (bet: number) => api.post('/games/hilo/start', { bet }).then((r) => r.data),
  hiloGuess: (id: string, direction: 'higher' | 'lower') => api.post(`/games/hilo/${id}/guess`, { direction }).then((r) => r.data),
  hiloCashout: (id: string) => api.post(`/games/hilo/${id}/cashout`).then((r) => r.data),

  blackjackDeal: (bet: number) => api.post('/games/blackjack/deal', { bet }).then((r) => r.data),
  blackjackAction: (id: string, action: 'hit' | 'stand' | 'double' | 'split') =>
    api.post(`/games/blackjack/${id}/${action}`).then((r) => r.data),
};
