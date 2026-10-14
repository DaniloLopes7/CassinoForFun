import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import Money from '../components/Money';
import { fmtOdds } from '../utils/odds';
import type { SportBet } from '../types/sports';

type Tab = 'open' | 'settled';

export default function MyBets() {
  const { t } = useTranslation();
  const { user, loading, setAuthOpen } = useUser();
  const [tab, setTab] = useState<Tab>('open');
  const [items, setItems] = useState<SportBet[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    api
      .get(tab === 'open' ? '/sports/my-bets?status=pending' : '/sports/my-bets')
      .then((r) => {
        const all: SportBet[] = r.data.items || [];
        setItems(tab === 'open' ? all : all.filter((b) => b.status !== 'pending'));
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [user, tab]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-3 py-6">
        <p className="text-ink-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-3 py-6">
        <div className="dbet-card p-8 text-center">
          <h1 className="font-display text-2xl text-gold">{t('sports.myBets')}</h1>
          <button className="dbet-btn-gold mt-4" onClick={() => setAuthOpen(true)}>
            {t('nav.login')}
          </button>
        </div>
      </div>
    );
  }

  const badge = (s: SportBet['status']) => {
    const label = t(`sports.bet${s[0].toUpperCase()}${s.slice(1)}`);
    if (s === 'won') return <span className="dbet-chip border-felt text-felt">{label}</span>;
    if (s === 'lost') return <span className="dbet-chip border-danger text-danger">{label}</span>;
    if (s === 'refunded') return <span className="dbet-chip text-ink-muted">{label}</span>;
    return <span className="dbet-chip border-gold/50 text-gold">{label}</span>;
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-gold md:text-3xl">{t('sports.myBets')}</h1>
        <Link to="/sports" className="dbet-btn-ghost">
          ← {t('nav.sports')}
        </Link>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className={`dbet-chip min-h-[36px] ${tab === 'open' ? 'border-gold text-gold' : 'text-ink-muted hover:border-gold'}`}
          onClick={() => setTab('open')}
        >
          {t('sports.openBets')}
        </button>
        <button
          className={`dbet-chip min-h-[36px] ${tab === 'settled' ? 'border-gold text-gold' : 'text-ink-muted hover:border-gold'}`}
          onClick={() => setTab('settled')}
        >
          {t('sports.settledBets')}
        </button>
      </div>

      {busy ? (
        <p className="mt-6 text-ink-muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-ink-muted">{tab === 'open' ? t('sports.openBets') : t('sports.settledBets')} — 0</p>
      ) : (
        <div className="dbet-card mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="dbet-label p-3">{t('nav.sports')}</th>
                <th className="dbet-label p-3">{t('sports.placeBet')}</th>
                <th className="dbet-label p-3 text-right">{t('games.multiplier')}</th>
                <th className="dbet-label p-3 text-right">{t('sports.stake')}</th>
                <th className="dbet-label p-3 text-right">{t('sports.potentialPayout')}</th>
                <th className="dbet-label p-3 text-right">{t('games.result')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b._id} className="border-b border-line/50 last:border-0">
                  <td className="p-3">
                    <p className="font-semibold">
                      {b.event.homeTeam} <span className="text-ink-faint">vs</span> {b.event.awayTeam}
                    </p>
                    <p className="text-xs text-ink-muted">{b.event.sportTitle}</p>
                    <p className="text-xs tabular text-ink-faint">{new Date(b.event.startsAt).toLocaleString()}</p>
                  </td>
                  <td className="p-3">{t(`sports.${b.outcome}`)}</td>
                  <td className="p-3 text-right tabular">{fmtOdds(b.odds)}</td>
                  <td className="p-3 text-right">
                    <Money cents={b.stake} />
                  </td>
                  <td className="p-3 text-right">
                    <Money cents={b.potentialPayout} className="text-gold" />
                  </td>
                  <td className="p-3 text-right">{badge(b.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
