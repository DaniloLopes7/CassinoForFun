import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { games } from '../services/games';
import { useUser } from '../context/UserContext';

// Simbolos e paytable (espelham o servidor)
const SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎', '7️⃣'];
const PAYTABLE: { combo: string; mult: number }[] = [
  { combo: '7️⃣7️⃣7️⃣', mult: 50 },
  { combo: '💎💎💎', mult: 25 },
  { combo: '⭐⭐⭐', mult: 12 },
  { combo: '🔔🔔🔔', mult: 8 },
  { combo: '🍋🍋🍋', mult: 5 },
  { combo: '🍒🍒🍒', mult: 4 },
  { combo: '🍒🍒', mult: 1.5 },
];

const rndSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

function errCode(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'server_error';
}

const reelCls = (highlight: boolean) =>
  `flex h-24 w-24 items-center justify-center rounded-xl border font-display text-6xl md:h-28 md:w-28 ${
    highlight ? 'border-gold bg-card shadow-goldglow' : 'border-line bg-surface'
  }`;

interface HistEntry {
  reels: string[];
  multiplier: number;
  payout: number;
}

export default function Slots() {
  const { t } = useTranslation();
  const { user, setAuthOpen, refresh } = useUser();
  const [bet, setBet] = useState(500);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(['7️⃣', '⭐', '🍒']);
  const [spinId, setSpinId] = useState(0);
  const [result, setResult] = useState<{ multiplier: number; payout: number } | null>(null);
  const [bigWin, setBigWin] = useState(false);
  const [history, setHistory] = useState<HistEntry[]>([]);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCycle = () => {
    if (cycleRef.current) {
      clearInterval(cycleRef.current);
      cycleRef.current = null;
    }
  };
  useEffect(() => stopCycle, []);

  const spin = async () => {
    if (!user) return setAuthOpen(true);
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    setBigWin(false);
    // animacao de giro: cicla emojis ate a resposta chegar
    cycleRef.current = setInterval(() => setReels([rndSymbol(), rndSymbol(), rndSymbol()]), 80);
    try {
      const res = await games.slots(bet);
      stopCycle();
      setReels(res.reels);
      setSpinId((n) => n + 1);
      setResult({ multiplier: res.multiplier, payout: res.payout });
      setHistory((h) => [{ reels: res.reels, multiplier: res.multiplier, payout: res.payout }, ...h].slice(0, 15));
      await refresh();
      if (res.multiplier >= 4) {
        setBigWin(true);
        toast.success(
          <>
            🎉 {t('slots.bigWin')} <Money cents={res.payout} />
          </>
        );
      }
    } catch (err) {
      stopCycle();
      const code = errCode(err);
      toast.error(t(`errors.${code}`, { defaultValue: code }));
    } finally {
      setSpinning(false);
    }
  };

  return (
    <GameLayout
      title={`🎰 ${t('games.slots')}`}
      stage={
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-8">
          <div className="flex gap-2 md:gap-4">
            {reels.map((s, i) =>
              spinning ? (
                <div key={i} className={reelCls(false)}>
                  {s}
                </div>
              ) : (
                <motion.div
                  key={`${spinId}-${i}`}
                  initial={{ y: -24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.12, type: 'spring', stiffness: 260, damping: 20 }}
                  className={reelCls(bigWin)}
                >
                  {s}
                </motion.div>
              )
            )}
          </div>
          {bigWin && (
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="animate-pulseGold rounded-xl px-6 py-2 font-display text-3xl text-gold"
            >
              🎉 {t('slots.bigWin')}
            </motion.p>
          )}
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          <BetAmount value={bet} onChange={setBet} disabled={spinning} />
          <button className="dbet-btn-gold w-full text-lg" onClick={spin} disabled={spinning}>
            🎰 {t('slots.spin')}
          </button>
          {result && (
            <p className={`text-center text-sm ${result.payout > 0 ? 'text-felt' : 'text-danger'}`} aria-live="polite">
              {result.payout > 0 ? t('common.won') : t('common.lost')} · {result.multiplier}× → <Money cents={result.payout} />
            </p>
          )}
        </div>
      }
      info={
        <div>
          <p className="dbet-label mb-1">{t('games.rules')}</p>
          <div className="mb-3 space-y-1 text-xs">
            {PAYTABLE.map((p) => (
              <div key={p.combo} className="flex items-center justify-between">
                <span aria-hidden>{p.combo}</span>
                <span className="tabular text-gold">{p.mult}×</span>
              </div>
            ))}
          </div>
          <p className="dbet-label mb-1">{t('games.history')}</p>
          <div className="flex flex-wrap gap-1">
            {history.map((h, i) => (
              <span
                key={i}
                title={`${h.reels.join('')} · ${h.multiplier}×`}
                className={`dbet-chip tabular ${h.multiplier >= 1 ? 'border-felt text-felt' : 'border-danger/50 text-danger'}`}
              >
                {h.reels.join('')} {h.multiplier}×
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}
