import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import { fmtOdds } from '../utils/odds';
import BetSlipModal, { type BetTarget } from '../components/sports/BetSlipModal';
import EventStatusBadge from '../components/sports/EventStatusBadge';
import type { SportEvent, SportMarket, SportOutcome } from '../types/sports';

export default function SportsEvent() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, setAuthOpen } = useUser();
  const [event, setEvent] = useState<SportEvent | null>(null);
  const [markets, setMarkets] = useState<SportMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<BetTarget | null>(null);

  useEffect(() => {
    api
      .get(`/sports/events/${id}`)
      .then((r) => {
        setEvent(r.data.event);
        setMarkets(r.data.markets || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const openBet = (market: SportMarket, outcome: SportOutcome) => {
    if (!user) return setAuthOpen(true);
    setTarget({
      marketId: market._id,
      outcome: outcome.key,
      outcomeLabel: outcome.label,
      odds: outcome.odds,
      eventTitle: `${event?.homeTeam} vs ${event?.awayTeam}`,
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-6">
        <p className="text-ink-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-6">
        <Link to="/sports" className="dbet-btn-ghost">
          ← {t('common.back')}
        </Link>
        <p className="mt-6 text-ink-muted">{t('sports.noEvents')}</p>
      </div>
    );
  }

  const showScore = (event.status === 'live' || event.status === 'finished') && event.homeScore != null && event.awayScore != null;

  return (
    <div className="mx-auto max-w-7xl px-3 py-6">
      <Link to="/sports" className="dbet-btn-ghost">
        ← {t('common.back')}
      </Link>

      <section className="dbet-card mt-4 p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="dbet-label text-gold">{event.sportTitle}</p>
          <EventStatusBadge status={event.status} />
        </div>
        <h1 className="mt-2 font-display text-2xl text-ink md:text-3xl">
          {event.homeTeam} <span className="text-ink-faint">vs</span> {event.awayTeam}
        </h1>
        {showScore && (
          <p className="mt-3 font-display text-4xl tabular text-gold">
            {event.homeScore} <span className="text-ink-faint">-</span> {event.awayScore}
          </p>
        )}
        <p className="mt-2 text-sm text-ink-muted">
          {t('sports.startsAt')}: <span className="tabular">{new Date(event.startsAt).toLocaleString()}</span>
        </p>
      </section>

      <div className="mt-4 grid gap-3">
        {markets.map((market) => (
          <section key={market._id} className="dbet-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="dbet-label">{t('sports.title')}</p>
              {market.status !== 'open' && <span className="dbet-chip text-ink-muted">{market.status}</span>}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {market.outcomes.map((o) => (
                <button
                  key={o.key}
                  className="dbet-card p-3 text-center transition-transform hover:scale-[1.02] hover:border-gold disabled:opacity-40"
                  disabled={market.status !== 'open'}
                  onClick={() => openBet(market, o)}
                >
                  <p className="truncate text-sm font-semibold">
                    {o.key === 'home' ? event.homeTeam : o.key === 'away' ? event.awayTeam : t('sports.draw')}
                  </p>
                  <p className="dbet-label mt-0.5">{t(`sports.${o.key}`, { defaultValue: o.label })}</p>
                  <p className="mt-1 text-lg font-bold tabular text-gold">{fmtOdds(o.odds)}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
        {markets.length === 0 && <p className="text-ink-muted">{t('sports.noEvents')}</p>}
      </div>

      <BetSlipModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
