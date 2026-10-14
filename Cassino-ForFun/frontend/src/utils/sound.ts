/**
 * Sons DBET via WebAudio (sem assets). Respeita dbet.sound=0 e prefers-reduced-motion.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (localStorage.getItem('dbet.sound') === '0') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, dur: number, delay = 0, type: OscillatorType = 'sine', vol = 0.12) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = a.currentTime + delay;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sounds = {
  click: () => tone(660, 0.08, 0, 'triangle', 0.06),
  bet: () => {
    tone(440, 0.09, 0, 'triangle');
    tone(550, 0.09, 0.07, 'triangle');
  },
  win: () => {
    tone(523, 0.12, 0, 'triangle');
    tone(659, 0.12, 0.1, 'triangle');
    tone(784, 0.2, 0.2, 'triangle');
  },
  bigWin: () => {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.15, i * 0.09, 'triangle', 0.14));
  },
  lose: () => {
    tone(311, 0.15, 0, 'sine');
    tone(233, 0.25, 0.12, 'sine');
  },
  crash: () => {
    tone(180, 0.4, 0, 'sawtooth', 0.1);
    tone(90, 0.5, 0.1, 'sawtooth', 0.08);
  },
};

/** Dispara som pelo resultado: payout > bet → win etc. */
export function playResult(payout: number, bet: number, multiplier = 0) {
  if (payout > bet) {
    if (multiplier >= 4) sounds.bigWin();
    else sounds.win();
  } else if (payout === 0) {
    sounds.lose();
  } else {
    sounds.click();
  }
}
