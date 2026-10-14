import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import Money from '../components/Money';

interface LeaderEntry {
  username: string;
  avatar?: string;
  level: number;
  stats: { bets: number; wagered: number; won: number; biggestWin: number };
}

type By = 'won' | 'wagered';

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_CLS = ['border-gold shadow-goldglow', 'border-[#C0C0C0]/60', 'border-[#CD7F32]/60'];

export default function Leaderboard() {
  const { t } = useTranslation();
  const [by, setBy] = useState<By>('won');
  const [top, setTop] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/users/leaderboard?by=${by}`)
      .then((r) => setTop(r.data.top || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [by]);

  return (
    <div className="mx-auto max-w-4xl px-3 py-6">
      <h1 className="font-display text-2xl text-gold md:text-3xl">{t('leaderboard.title')}</h1>

      <div className="mt-4 flex gap-2">
        <button
          className={`dbet-chip min-h-[36px] ${by === 'won' ? 'border-gold text-gold' : 'text-ink-muted hover:border-gold'}`}
          onClick={() => setBy('won')}
        >
          {t('leaderboard.byWon')}
        </button>
        <button
          className={`dbet-chip min-h-[36px] ${by === 'wagered' ? 'border-gold text-gold' : 'text-ink-muted hover:border-gold'}`}
          onClick={() => setBy('wagered')}
        >
          {t('leaderboard.byWagered')}
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-ink-muted">{t('common.loading')}</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {top.map((u, i) => (
            <div
              key={u.username}
              className={`dbet-card flex items-center gap-3 p-3 ${i < 3 ? PODIUM_CLS[i] : ''}`}
            >
              <span className={`w-8 text-center font-display text-lg tabular ${i === 0 ? 'text-gold' : 'text-ink-muted'}`}>
                {MEDALS[i] || i + 1}
              </span>
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-9 w-9 rounded-full border border-line object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card font-display text-sm text-gold">
                  {u.username.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${i === 0 ? 'text-gold' : ''}`}>{u.username}</p>
                <p className="text-xs text-ink-muted">
                  {t('leaderboard.level')} {u.level}
                </p>
              </div>
              <Money cents={by === 'won' ? u.stats.won : u.stats.wagered} className={i === 0 ? 'text-gold' : ''} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
