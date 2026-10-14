import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { getSocket } from '../services/socket';
import { useUser } from '../context/UserContext';
import { sounds } from '../utils/sound';

interface BetEntry {
  userId: string;
  username: string;
  bet: number;
  cashedAt: number | null;
  payout: number | null;
}
interface CrashState {
  status: 'betting' | 'running' | 'crashed';
  roundId: number;
  multiplier: number;
  crashPoint?: number;
  bettingEndsAt: number;
  history: number[];
  bets: BetEntry[];
}

export default function Crash() {
  const { t } = useTranslation();
  const { user, setAuthOpen } = useUser();
  const [st, setSt] = useState<CrashState | null>(null);
  const [bet, setBet] = useState(500);
  const [countdown, setCountdown] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const [myBet, setMyBet] = useState<BetEntry | null>(null);

  useEffect(() => {
    const s = getSocket();
    const onState = (x: CrashState) => {
      setSt((prev) => {
        if (prev && prev.status === 'running' && x.status === 'crashed') {
          pointsRef.current = [];
          sounds.crash();
        }
        if (x.status === 'betting') pointsRef.current = [];
        return x;
      });
      if (user) {
        const mine = x.bets.find((b) => b.userId === user.id);
        setMyBet(mine || null);
      }
    };
    const onTick = ({ multiplier }: { multiplier: number }) => {
      setSt((prev) => (prev ? { ...prev, multiplier } : prev));
      if (st?.status === 'running' || st == null) {
        pointsRef.current.push({ x: Date.now(), y: multiplier });
        if (pointsRef.current.length > 600) pointsRef.current.shift();
      }
    };
    const onErr = (e: { scope: string; error: string }) => {
      if (e.scope === 'crash') toast.error(t(`errors.${e.error}`, { defaultValue: e.error }));
    };
    s.on('crash:state', onState);
    s.on('crash:tick', onTick);
    s.on('actionError', onErr);
    const onCashed = () => sounds.win();
    s.on('crash:cashed', onCashed);
    return () => {
      s.off('crash:state', onState);
      s.off('crash:tick', onTick);
      s.off('actionError', onErr);
      s.off('crash:cashed', onCashed);
    };
  }, [user, t, st?.status]);

  // countdown
  useEffect(() => {
    if (st?.status !== 'betting') return;
    const iv = setInterval(() => setCountdown(Math.max(0, (st.bettingEndsAt - Date.now()) / 1000)), 100);
    return () => clearInterval(iv);
  }, [st?.status, st?.bettingEndsAt]);

  // canvas do grafico
  const status = st?.status;
  const multiplier = st?.multiplier ?? 1;
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    let raf: number;
    const draw = () => {
      const { width: w, height: h } = cv.getBoundingClientRect();
      cv.width = w * devicePixelRatio;
      cv.height = h * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, w, h);

      const pts = pointsRef.current;
      if (pts.length > 1) {
        const maxY = Math.max(st?.crashPoint || 2, ...pts.map((p) => p.y)) * 1.15;
        const dur = Math.max(12000, pts[pts.length - 1].x - pts[0].x);
        ctx.beginPath();
        pts.forEach((p, i) => {
          const x = ((p.x - pts[0].x) / dur) * w;
          const y = h - (Math.log(p.y) / Math.log(maxY)) * h * 0.9;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, '#0B6B4B');
        grad.addColorStop(1, '#F5C542');
        ctx.strokeStyle = status === 'crashed' ? '#D7263D' : grad;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [status, st?.crashPoint]);

  const canBet = status === 'betting' && !myBet;

  return (
    <GameLayout
      title={`🚀 ${t('games.crash')}`}
      stage={
        <div className="relative h-full w-full">
          <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p
              className={`font-display text-5xl md:text-7xl tabular ${
                status === 'crashed' ? 'text-danger' : multiplier > 1.5 ? 'text-gold' : 'text-ink'
              }`}
            >
              {multiplier.toFixed(2)}×
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {status === 'betting' && `${t('crash.waiting')} — ${countdown.toFixed(1)}s`}
              {status === 'running' && t('crash.running')}
              {status === 'crashed' && `${t('crash.crashed')} ${multiplier.toFixed(2)}×`}
            </p>
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          <BetAmount value={bet} onChange={setBet} disabled={!canBet} />
          {canBet ? (
            <button
              className="dbet-btn-gold w-full text-lg"
              onClick={() => {
                if (!user) return setAuthOpen(true);
                getSocket().emit('crash:bet', { amount: bet });
              }}
            >
              {t('crash.placeBet')}
            </button>
          ) : myBet && status === 'running' && !myBet.cashedAt ? (
            <button className="dbet-btn-felt w-full animate-pulseGold text-lg" onClick={() => getSocket().emit('crash:cashout')}>
              {t('crash.cashOut')} <Money cents={Math.floor(myBet.bet * multiplier)} />
            </button>
          ) : (
            <button className="dbet-btn-ghost w-full" disabled>
              {status === 'betting' ? t('games.loading') : t('crash.waiting')}
            </button>
          )}
          {myBet?.cashedAt && (
            <p className="text-center text-sm text-felt">
              {t('crash.cashOut')} @ {myBet.cashedAt.toFixed(2)}× → <Money cents={myBet.payout || 0} />
            </p>
          )}
        </div>
      }
      info={
        <div>
          <p className="mb-2 text-xs">{t('crash.howItWorks')}</p>
          <p className="dbet-label mb-1">{t('games.history')}</p>
          <div className="flex flex-wrap gap-1">
            {(st?.history || []).slice(0, 15).map((hRow, i) => (
              <span key={i} className={`dbet-chip tabular ${hRow >= 2 ? 'border-felt text-felt' : 'border-danger/50 text-danger'}`}>
                {hRow.toFixed(2)}×
              </span>
            ))}
          </div>
          <p className="dbet-label mb-1 mt-3">{t('crash.liveBets')}</p>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {(st?.bets || []).map((b) => (
              <div key={b.userId} className="flex items-center justify-between text-xs">
                <span className={b.userId === user?.id ? 'text-gold' : ''}>{b.username}</span>
                <span className="tabular">
                  <Money cents={b.bet} />
                  {b.cashedAt && <span className="text-felt"> @{b.cashedAt.toFixed(2)}×</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}
