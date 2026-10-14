import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { games } from '../services/games';
import { useUser } from '../context/UserContext';
import { rankName } from '../utils/odds';

const SUITS = ['♠', '♥', '♦', '♣'] as const;
const randomSuit = () => SUITS[Math.floor(Math.random() * SUITS.length)];

type Phase = 'idle' | 'active';
type Direction = 'higher' | 'lower';

interface Probs {
  higher: number;
  lower: number;
}
interface HiloStartRes {
  sessionId: string;
  rank: number;
  probs: Probs;
  multiplier: number;
}
interface HiloGuessRes {
  win: boolean;
  prevRank: number;
  nextRank: number;
  multiplier: number;
  streak: number;
  probs: Probs;
}
interface HiloCashoutRes {
  payout: number;
  multiplier: number;
}
interface HistEntry {
  id: number;
  streak: number;
  multiplier: number;
  lost: boolean;
}

export default function Hilo() {
  const { t } = useTranslation();
  const { user, setAuthOpen, refresh } = useUser();
  const [bet, setBet] = useState(500);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [suit, setSuit] = useState<string>('♠');
  const [probs, setProbs] = useState<Probs>({ higher: 0, lower: 0 });
  const [multiplier, setMultiplier] = useState(1);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistEntry[]>([]);

  const onError = (e: unknown) => {
    const code = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'server_error';
    toast.error(t(`errors.${code}`, { defaultValue: code }));
  };

  const start = async () => {
    if (!user) return setAuthOpen(true);
    if (busy) return;
    setBusy(true);
    try {
      const res: HiloStartRes = await games.hiloStart(bet);
      setSessionId(res.sessionId);
      setRank(res.rank);
      setSuit(randomSuit());
      setProbs(res.probs);
      setMultiplier(res.multiplier);
      setStreak(0);
      setPhase('active');
      refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const guess = async (direction: Direction) => {
    if (phase !== 'active' || !sessionId || busy) return;
    setBusy(true);
    try {
      const res: HiloGuessRes = await games.hiloGuess(sessionId, direction);
      setRank(res.nextRank);
      setSuit(randomSuit());
      if (res.win) {
        // durante a streak o saldo nao muda — sem refresh aqui
        setMultiplier(res.multiplier);
        setStreak(res.streak);
        setProbs(res.probs);
      } else {
        setPhase('idle');
        setSessionId(null);
        setMultiplier(0);
        toast.error(`${t('common.lost')} — ${rankName(res.nextRank)}`);
        setHistory((h) => [{ id: Date.now(), streak: res.streak, multiplier: 0, lost: true }, ...h].slice(0, 15));
        refresh();
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const cashout = async () => {
    if (phase !== 'active' || !sessionId || busy || streak === 0) return;
    setBusy(true);
    try {
      const res: HiloCashoutRes = await games.hiloCashout(sessionId);
      toast.success(
        <span className="inline-flex items-center gap-1">
          {t('hilo.cashOut')} {res.multiplier.toFixed(2)}× → <Money cents={res.payout} />
        </span>
      );
      setHistory((h) => [{ id: Date.now(), streak, multiplier: res.multiplier, lost: false }, ...h].slice(0, 15));
      setPhase('idle');
      setSessionId(null);
      setMultiplier(res.multiplier);
      refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const suitRed = suit === '♥' || suit === '♦';

  return (
    <GameLayout
      title={`🃏 ${t('games.hilo')}`}
      stage={
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <motion.div
            key={`${rank ?? 'none'}-${suit}`}
            initial={{ rotateY: 90, opacity: 0.5 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex h-44 w-32 flex-col items-center justify-center rounded-xl border border-line bg-ink text-base shadow-card"
          >
            <span className={`font-display text-8xl leading-none ${suitRed ? 'text-danger' : ''}`}>
              {rank != null ? rankName(rank) : '?'}
            </span>
            <span className={`mt-2 text-3xl leading-none ${suitRed ? 'text-danger' : ''}`}>{suit}</span>
          </motion.div>
          <div className="flex items-center gap-2 text-sm">
            <span className="dbet-chip">
              {t('hilo.streak')}: <b className="tabular">{streak}</b>
            </span>
            <span className="dbet-chip border-gold/60 text-gold tabular">{multiplier.toFixed(2)}×</span>
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          {phase === 'idle' ? (
            <>
              <BetAmount value={bet} onChange={setBet} disabled={busy} />
              <button className="dbet-btn-gold w-full text-lg" disabled={busy} onClick={start}>
                {t('hilo.start')}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="dbet-label">{t('games.multiplier')}</span>
                <span className="font-display text-2xl text-gold tabular">{multiplier.toFixed(2)}×</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="dbet-btn-ghost flex-col gap-0.5"
                  disabled={busy || probs.higher <= 0}
                  onClick={() => guess('higher')}
                >
                  <span className="font-semibold">⬆ {t('hilo.higher')}</span>
                  <span className="text-xs font-normal text-ink-muted tabular">{(probs.higher * 100).toFixed(1)}%</span>
                </button>
                <button
                  className="dbet-btn-ghost flex-col gap-0.5"
                  disabled={busy || probs.lower <= 0}
                  onClick={() => guess('lower')}
                >
                  <span className="font-semibold">⬇ {t('hilo.lower')}</span>
                  <span className="text-xs font-normal text-ink-muted tabular">{(probs.lower * 100).toFixed(1)}%</span>
                </button>
              </div>
              <button className="dbet-btn-felt w-full" disabled={busy || streak === 0} onClick={cashout}>
                {t('hilo.cashOut')} <Money cents={Math.round(bet * multiplier)} />
              </button>
            </>
          )}
        </div>
      }
      info={
        <div>
          <p className="mb-2 text-xs">{t('hilo.howItWorks')}</p>
          <p className="dbet-label mb-1">{t('games.history')}</p>
          <div className="flex flex-wrap gap-1">
            {history.map((h) => (
              <span
                key={h.id}
                className={`dbet-chip tabular ${h.lost ? 'border-danger/50 text-danger' : 'border-felt text-felt'}`}
              >
                {h.lost ? '✕' : `${h.multiplier.toFixed(2)}×`}
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}
