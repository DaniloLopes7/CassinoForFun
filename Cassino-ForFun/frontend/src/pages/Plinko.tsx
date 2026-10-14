import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { games, PlinkoResult } from '../services/games';
import { useUser } from '../context/UserContext';

const ROWS_OPTIONS = [8, 12, 16];
const SY = 26; // espaco vertical entre linhas de pinos
const TOP = 20; // margem superior da 1a linha de pinos
const BALL = 14;

function errCode(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'server_error';
}

// Tabela de multiplicadores (espelha o servidor) p/ exibir os bins antes da 1a jogada
function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
function multiplierTable(rows: number): number[] {
  const out: number[] = [];
  for (let k = 0; k <= rows; k++) {
    const p = comb(rows, k) / Math.pow(2, rows);
    let m = ((1 - 0.03) / p) * 0.42;
    m = Math.min(120, Math.max(0.2, m));
    out.push(Math.round(m * 100) / 100);
  }
  return out;
}

const fmtMult = (m: number) => `${m >= 9.95 ? Math.round(m) : Math.round(m * 10) / 10}×`;

interface HistEntry {
  multiplier: number;
  payout: number;
}

export default function Plinko() {
  const { t } = useTranslation();
  const { user, setAuthOpen, refresh } = useUser();
  const [bet, setBet] = useState(500);
  const [rows, setRows] = useState(12);
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState<PlinkoResult | null>(null);
  const [dropId, setDropId] = useState(0);
  const [landed, setLanded] = useState(false);
  const [history, setHistory] = useState<HistEntry[]>([]);

  const gap = rows === 16 ? 21 : rows === 12 ? 28 : 36; // espaco horizontal entre pinos
  const table = result && result.rows === rows ? result.table : multiplierTable(rows);

  // Trajetoria da bola: segue path (0=esq, 1=dir), com um pequeno arco entre pinos
  const path = useMemo(() => {
    if (!result) return null;
    const xs: number[] = [0];
    const ys: number[] = [TOP];
    let k = 0;
    for (let i = 0; i < result.rows; i++) {
      if (result.path[i] === 1) k++;
      const nx = (k - (i + 1) / 2) * gap;
      const ny = TOP + (i + 1) * SY;
      xs.push((xs[xs.length - 1] + nx) / 2, nx);
      ys.push(ys[ys.length - 1] - Math.min(10, SY / 2), ny);
    }
    return {
      xs,
      ys,
      times: xs.map((_, i) => i / (xs.length - 1)),
      duration: result.rows * 0.16,
    };
  }, [result, gap]);

  const onLanded = () => {
    setLanded(true);
    setDropping(false);
    if (result) {
      setHistory((h) => [{ multiplier: result.multiplier, payout: result.payout }, ...h].slice(0, 15));
      void refresh();
    }
  };

  const drop = async () => {
    if (!user) return setAuthOpen(true);
    if (dropping) return;
    setDropping(true);
    setLanded(false);
    try {
      const res = await games.plinko(bet, rows);
      setResult(res);
      setDropId((n) => n + 1);
    } catch (err) {
      const code = errCode(err);
      toast.error(t(`errors.${code}`, { defaultValue: code }));
      setDropping(false);
    }
  };

  const changeRows = (r: number) => {
    setRows(r);
    setResult(null);
    setLanded(false);
  };

  return (
    <GameLayout
      title={`⚪ ${t('games.plinko')}`}
      stage={
        <div className="flex h-full w-full items-start justify-center overflow-x-auto py-2">
          <div className="relative" style={{ height: TOP + rows * SY + 52, width: rows * gap + gap * 2 }}>
            {/* pinos: linha i tem i+1 pinos */}
            {Array.from({ length: rows }).map((_, i) =>
              Array.from({ length: i + 1 }).map((_, j) => (
                <div
                  key={`${i}-${j}`}
                  className="absolute h-1.5 w-1.5 rounded-full bg-ink-faint"
                  style={{
                    left: `calc(50% + ${(j - i / 2) * gap}px)`,
                    top: TOP + i * SY,
                    transform: 'translate(-50%,-50%)',
                  }}
                  aria-hidden
                />
              ))
            )}
            {/* bola */}
            {result && path && (
              <motion.div
                key={dropId}
                className="absolute z-10 rounded-full bg-gold shadow-goldglow"
                style={{ width: BALL, height: BALL, left: '50%', marginLeft: -BALL / 2, marginTop: -BALL / 2, top: 0 }}
                initial={{ x: 0, y: TOP - SY, opacity: 0 }}
                animate={{ x: path.xs, y: path.ys, opacity: 1 }}
                transition={{ duration: path.duration, times: path.times, ease: 'easeIn' }}
                onAnimationComplete={onLanded}
              />
            )}
            {/* bins com multiplicadores */}
            {table.map((m, b) => {
              const isFinal = landed && result?.bin === b;
              const win = (result?.multiplier ?? 0) >= 1;
              return (
                <div
                  key={b}
                  className={`absolute flex items-center justify-center rounded-md border font-semibold tabular ${
                    rows === 16 ? 'text-[9px]' : 'text-[11px]'
                  } ${
                    isFinal
                      ? win
                        ? 'border-felt bg-felt/30 text-felt'
                        : 'border-danger bg-danger/30 text-danger'
                      : m >= 1
                        ? 'border-line bg-surface text-ink-muted'
                        : 'border-line bg-surface text-ink-faint'
                  }`}
                  style={{
                    left: `calc(50% + ${(b - rows / 2) * gap}px)`,
                    top: TOP + rows * SY + 14,
                    transform: 'translateX(-50%)',
                    width: Math.max(20, gap - 2),
                    height: 26,
                  }}
                >
                  {fmtMult(m)}
                </div>
              );
            })}
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          <BetAmount value={bet} onChange={setBet} disabled={dropping} />
          <div>
            <p className="dbet-label">{t('plinko.rows')}</p>
            <div className="mt-1 grid grid-cols-3 gap-1" role="group" aria-label={t('plinko.rows')}>
              {ROWS_OPTIONS.map((r) => (
                <button
                  key={r}
                  disabled={dropping}
                  onClick={() => changeRows(r)}
                  aria-pressed={rows === r}
                  className={`dbet-chip min-h-[36px] justify-center hover:border-gold ${rows === r ? 'border-gold text-gold' : ''}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button className="dbet-btn-gold w-full text-lg" onClick={drop} disabled={dropping}>
            ⚪ {t('plinko.drop')}
          </button>
          {landed && result && (
            <p className={`text-center text-sm ${result.multiplier >= 1 ? 'text-felt' : 'text-danger'}`} aria-live="polite">
              {result.multiplier >= 1 ? t('common.won') : t('common.lost')} · {result.multiplier}× →{' '}
              <Money cents={result.payout} />
            </p>
          )}
        </div>
      }
      info={
        <div>
          <p className="dbet-label mb-1">{t('games.multiplier')}</p>
          <div className="mb-3 flex flex-wrap gap-1">
            {table.map((m, i) => (
              <span
                key={i}
                className={`dbet-chip tabular ${
                  landed && result?.bin === i
                    ? 'border-gold text-gold'
                    : m >= 1
                      ? 'border-line text-ink-muted'
                      : 'border-line text-ink-faint'
                }`}
              >
                {fmtMult(m)}
              </span>
            ))}
          </div>
          <p className="dbet-label mb-1">{t('games.history')}</p>
          <div className="flex flex-wrap gap-1">
            {history.map((h, i) => (
              <span
                key={i}
                className={`dbet-chip tabular ${h.multiplier >= 1 ? 'border-felt text-felt' : 'border-danger/50 text-danger'}`}
              >
                {h.multiplier}×
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}
