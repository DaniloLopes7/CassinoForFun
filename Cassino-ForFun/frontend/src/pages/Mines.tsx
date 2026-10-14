import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { games } from '../services/games';
import { useUser } from '../context/UserContext';

const TILES = 25;
const MINE_OPTIONS = [1, 3, 5, 10, 24];

type Phase = 'idle' | 'active' | 'busted' | 'cashed';

interface MinesStartRes {
  sessionId: string;
  mineCount: number;
}
interface MinesRevealRes {
  busted: boolean;
  tile: number;
  revealed: number[];
  multiplier: number;
  nextPayout: number;
  minePositions?: number[];
  payout?: number;
}
interface MinesCashoutRes {
  payout: number;
  multiplier: number;
  minePositions: number[];
}
interface HistEntry {
  id: number;
  mines: number;
  multiplier: number;
  payout: number;
  busted: boolean;
}

export default function Mines() {
  const { t } = useTranslation();
  const { user, setAuthOpen, refresh } = useUser();
  const [bet, setBet] = useState(500);
  const [mineCount, setMineCount] = useState(3);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[] | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [nextPayout, setNextPayout] = useState(0);
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
      const res: MinesStartRes = await games.minesStart(bet, mineCount);
      setSessionId(res.sessionId);
      setRevealed([]);
      setMinePositions(null);
      setMultiplier(1);
      setNextPayout(bet);
      setPhase('active');
      refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const reveal = async (tile: number) => {
    if (phase !== 'active' || !sessionId || busy) return;
    setBusy(true);
    try {
      const res: MinesRevealRes = await games.minesReveal(sessionId, tile);
      if (res.busted) {
        if (res.revealed) setRevealed(res.revealed);
        setMinePositions(res.minePositions || []);
        setMultiplier(0);
        setNextPayout(0);
        setPhase('busted');
        toast.error(t('mines.busted'));
        setHistory((h) =>
          [{ id: Date.now(), mines: mineCount, multiplier: 0, payout: 0, busted: true }, ...h].slice(0, 15)
        );
        refresh();
      } else {
        setRevealed(res.revealed);
        setMultiplier(res.multiplier);
        setNextPayout(res.nextPayout);
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const cashout = async () => {
    if (phase !== 'active' || !sessionId || busy || revealed.length === 0) return;
    setBusy(true);
    try {
      const res: MinesCashoutRes = await games.minesCashout(sessionId);
      setMinePositions(res.minePositions || []);
      setMultiplier(res.multiplier);
      setNextPayout(res.payout);
      setPhase('cashed');
      toast.success(
        <span className="inline-flex items-center gap-1">
          {t('mines.cashOut')} {res.multiplier.toFixed(2)}× → <Money cents={res.payout} />
        </span>
      );
      setHistory((h) =>
        [{ id: Date.now(), mines: mineCount, multiplier: res.multiplier, payout: res.payout, busted: false }, ...h].slice(0, 15)
      );
      refresh();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameLayout
      title={`💎 ${t('games.mines')}`}
      stage={
        <div className="flex w-full flex-col items-center gap-3">
          <div className="grid w-full max-w-[360px] grid-cols-5 gap-2">
            {Array.from({ length: TILES }, (_, i) => {
              const isMine = minePositions?.includes(i) ?? false;
              const isSafe = !isMine && revealed.includes(i);
              const cls = isMine
                ? 'border-danger bg-danger/30'
                : isSafe
                  ? 'border-felt bg-felt/30'
                  : 'border-line bg-card hover:border-gold';
              return (
                <button
                  key={i}
                  aria-label={`tile ${i + 1}`}
                  disabled={phase !== 'active' || isSafe || busy}
                  onClick={() => reveal(i)}
                  className={`flex aspect-square min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border text-xl transition-colors disabled:cursor-not-allowed ${cls}`}
                >
                  {isMine ? '💣' : isSafe ? '💎' : ''}
                </button>
              );
            })}
          </div>
          {phase === 'busted' && <p className="text-sm font-semibold text-danger">{t('mines.busted')}</p>}
          {phase === 'cashed' && (
            <p className="text-sm font-semibold text-felt">
              {multiplier.toFixed(2)}× → <Money cents={nextPayout} />
            </p>
          )}
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          {phase !== 'active' ? (
            <>
              <BetAmount value={bet} onChange={setBet} disabled={busy} />
              <div>
                <label className="dbet-label">{t('mines.mineCount')}</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {MINE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      disabled={busy}
                      onClick={() => setMineCount(m)}
                      className={`dbet-chip min-h-[44px] px-4 text-sm ${
                        mineCount === m ? 'border-gold text-gold' : 'hover:border-gold'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <button className="dbet-btn-gold w-full text-lg" disabled={busy} onClick={start}>
                {t('mines.start')}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="dbet-label">{t('games.multiplier')}</span>
                <span className="font-display text-2xl text-gold tabular">{multiplier.toFixed(2)}×</span>
              </div>
              <div className="flex items-center justify-between text-sm text-ink-muted">
                <span>{t('mines.mineCount')}</span>
                <span className="tabular">{mineCount} 💣</span>
              </div>
              <button
                className="dbet-btn-felt w-full text-lg"
                disabled={busy || revealed.length === 0}
                onClick={cashout}
              >
                {t('mines.cashOut')} <Money cents={nextPayout} />
              </button>
            </>
          )}
        </div>
      }
      info={
        <div>
          <p className="mb-2 text-xs">{t('mines.howItWorks')}</p>
          <p className="dbet-label mb-1">{t('games.history')}</p>
          <div className="flex flex-wrap gap-1">
            {history.map((h) => (
              <span
                key={h.id}
                className={`dbet-chip tabular ${h.busted ? 'border-danger/50 text-danger' : 'border-felt text-felt'}`}
              >
                {h.busted ? '💣' : `${h.multiplier.toFixed(2)}×`}
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}
