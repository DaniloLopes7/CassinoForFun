import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import GameLayout from '../components/game/GameLayout';
import BetAmount from '../components/game/BetAmount';
import Money from '../components/Money';
import { games } from '../services/games';
import { useUser } from '../context/UserContext';

function errCode(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'server_error';
}

// Multiplicador com 1% de house edge (espelha o servidor)
const calcMult = (chance: number) => Math.floor((100 / chance) * 0.99 * 10000) / 10000;

interface HistEntry {
  roll: number;
  win: boolean;
  multiplier: number;
}

export default function Dice() {
  const { t } = useTranslation();
  const { user, setAuthOpen, refresh } = useUser();
  const [bet, setBet] = useState(500);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<'over' | 'under'>('over');
  const [rolling, setRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [result, setResult] = useState<{ roll: number; win: boolean; multiplier: number; payout: number } | null>(null);
  const [history, setHistory] = useState<HistEntry[]>([]);

  const chance = direction === 'over' ? 100 - target : target;
  const mult = calcMult(chance);

  const roll = async () => {
    if (!user) return setAuthOpen(true);
    if (rolling) return;
    setRolling(true);
    try {
      const res = await games.dice(bet, target, direction);
      setResult(res);
      setRollKey((k) => k + 1);
      setHistory((h) => [{ roll: res.roll, win: res.win, multiplier: res.multiplier }, ...h].slice(0, 15));
      await refresh();
    } catch (err) {
      const code = errCode(err);
      toast.error(t(`errors.${code}`, { defaultValue: code }));
    } finally {
      setRolling(false);
    }
  };

  return (
    <GameLayout
      title={`🎲 ${t('games.dice')}`}
      stage={
        <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-2">
          <p
            className={`font-display text-6xl tabular md:text-8xl ${result ? (result.win ? 'text-felt' : 'text-danger') : 'text-ink-faint'}`}
            aria-live="polite"
          >
            {result ? result.roll.toFixed(2) : '🎲'}
          </p>
          <div className="w-full max-w-md">
            <div className="relative">
              {/* trilho 0-100: verde se ganhou, vermelho se perdeu */}
              <div
                className={`h-4 w-full rounded-full transition-colors ${
                  result ? (result.win ? 'bg-felt/30' : 'bg-danger/30') : 'bg-surface'
                }`}
              >
                {/* zona vencedora (over: target..100 / under: 0..target) */}
                <div
                  className="absolute top-0 h-4 rounded-full bg-gold/15"
                  style={direction === 'over' ? { left: `${target}%`, right: 0 } : { left: 0, width: `${target}%` }}
                />
                {/* marcador do alvo */}
                <div className="absolute top-0 h-4 w-0.5 bg-gold" style={{ left: `${target}%` }} />
              </div>
              {/* marcador do resultado */}
              {result && (
                <motion.div
                  key={rollKey}
                  className={`absolute -top-2 h-8 w-8 -translate-x-1/2 rounded-full border-4 border-base ${
                    result.win ? 'bg-felt' : 'bg-danger'
                  }`}
                  initial={{ left: '50%' }}
                  animate={{ left: `${result.roll}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 15 }}
                  aria-hidden
                />
              )}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-ink-faint" aria-hidden>
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>
      }
      controls={
        <div className="flex flex-col gap-3">
          <BetAmount value={bet} onChange={setBet} disabled={rolling} />
          <div>
            <div className="flex items-center justify-between">
              <label className="dbet-label" htmlFor="dice-target">
                {t('dice.target')}
              </label>
              <span className="tabular text-sm font-semibold text-gold">{target}</span>
            </div>
            <input
              id="dice-target"
              type="range"
              min={2}
              max={98}
              step={1}
              value={target}
              disabled={rolling}
              onChange={(e) => setTarget(parseInt(e.target.value, 10))}
              className="mt-1 w-full accent-gold"
              aria-label={t('dice.target')}
              aria-valuetext={`${target}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-1" role="group" aria-label={`${t('dice.rollOver')} / ${t('dice.rollUnder')}`}>
            {(['over', 'under'] as const).map((d) => (
              <button
                key={d}
                disabled={rolling}
                onClick={() => setDirection(d)}
                aria-pressed={direction === d}
                className={`dbet-chip min-h-[36px] justify-center hover:border-gold ${direction === d ? 'border-gold text-gold' : ''}`}
              >
                {d === 'over' ? t('dice.rollOver') : t('dice.rollUnder')}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg border border-line bg-surface p-2">
              <p className="dbet-label">{t('dice.chance')}</p>
              <p className="tabular font-semibold text-gold">{chance}%</p>
            </div>
            <div className="rounded-lg border border-line bg-surface p-2">
              <p className="dbet-label">{t('games.multiplier')}</p>
              <p className="tabular font-semibold text-gold">{mult.toFixed(4)}×</p>
            </div>
          </div>
          <button className="dbet-btn-gold w-full text-lg" onClick={roll} disabled={rolling}>
            🎲 {t('dice.roll')}
          </button>
          {result && (
            <p className={`text-center text-sm ${result.win ? 'text-felt' : 'text-danger'}`} aria-live="polite">
              {result.win ? t('common.won') : t('common.lost')} · {result.multiplier}× → <Money cents={result.payout} />
            </p>
          )}
        </div>
      }
      info={
        <div>
          <p className="dbet-label mb-1">{t('games.rules')}</p>
          <p className="mb-3 text-xs">
            🎲 {t('dice.rollOver')} {target} → {t('dice.chance')} {100 - target}%
            <br />
            🎲 {t('dice.rollUnder')} {target} → {t('dice.chance')} {target}%
          </p>
          <p className="dbet-label mb-1">{t('games.history')}</p>
          <div className="flex flex-wrap gap-1">
            {history.map((h, i) => (
              <span
                key={i}
                className={`dbet-chip tabular ${h.win ? 'border-felt text-felt' : 'border-danger/50 text-danger'}`}
              >
                {h.roll.toFixed(2)}
                {h.win ? ` · ${h.multiplier}×` : ''}
              </span>
            ))}
          </div>
        </div>
      }
    />
  );
}
