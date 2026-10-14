import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import { fmtOdds } from '../utils/odds';
import BetSlipModal, { type BetTarget } from '../components/sports/BetSlipModal';
import EventStatusBadge from '../components/sports/EventStatusBadge';
import type { SportEvent, SportMarket, SportOutcome } from '../types/sports';

const ALL = '';

export default function Sports() {
  const { t } = useTranslation();
  const { user, setAuthOpen } = useUser();
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<string>(ALL);
  const [target, setTarget] = useState<BetTarget | null>(null);

  useEffect(() => {
    api
      .get('/sports/events')
      .then((r) => setEvents(r.data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sportKeys = useMemo(() => Array.from(new Set(events.map((e) => e.sportKey))), [events]);
  const filtered = sport === ALL ? events : events.filter((e) => e.sportKey === sport);
  const showDemoNotice = events.some((e) => e.isDemo);

  const chipCls = (active: boolean) =>
    `dbet-chip min-h-[36px] ${active ? 'border-gold text-gold' : 'text-ink-muted hover:border-gold'}`;

  const openBet = (ev: SportEvent, market: SportMarket, outcome: SportOutcome) => {
    if (!user) return setAuthOpen(true);
    setTarget({
      marketId: market._id,
      outcome: outcome.key,
      outcomeLabel: outcome.label,
      odds: outcome.odds,
      eventTitle: `${ev.homeTeam} vs ${ev.awayTeam}`,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-gold md:text-3xl">{t('sports.title')}</h1>
        <Link to="/sports/bets" className="dbet-btn-ghost">
          {t('sports.myBets')}
        </Link>
      </div>

      {showDemoNotice && <p className="dbet-card mt-4 border-gold/40 p-3 text-sm text-gold">{t('sports.demoMode')}</p>}

      {sportKeys.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={chipCls(sport === ALL)} onClick={() => setSport(ALL)}>
            {t('common.all')}
          </button>
          {sportKeys.map((k) => (
            <button key={k} className={chipCls(sport === k)} onClick={() => setSport(k)}>
              {events.find((e) => e.sportKey === k)?.sportTitle || k}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-ink-muted">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-ink-muted">{t('sports.noEvents')}</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ev) => {
            const market = ev.markets?.find((m) => m.key === 'h2h') || ev.markets?.[0];
            return (
              <div key={ev._id} className="dbet-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="dbet-label">{ev.sportTitle}</p>
                  <EventStatusBadge status={ev.status} />
                </div>
                <Link to={`/sports/${ev._id}`} className="mt-2 block hover:text-gold">
                  <p className="font-semibold">
                    {ev.homeTeam} <span className="text-ink-faint">vs</span> {ev.awayTeam}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t('sports.startsAt')}: <span className="tabular">{new Date(ev.startsAt).toLocaleString()}</span>
                  </p>
                </Link>
                {market && market.status === 'open' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {market.outcomes.map((o) => (
                      <button
                        key={o.key}
                        className="dbet-chip odds hover:border-gold"
                        title={o.label}
                        onClick={() => openBet(ev, market, o)}
                      >
                        {o.key === 'draw' ? 'X' : o.key === 'home' ? '1' : '2'} · {fmtOdds(o.odds)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BetSlipModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
