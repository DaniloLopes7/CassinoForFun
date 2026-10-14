import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Money from '../components/Money';
import { useUser } from '../context/UserContext';
import { fmtOdds } from '../utils/odds';

const GAME_CARDS = [
  { to: '/crash', icon: '🚀', name: 'games.crash', desc: 'crash.howItWorks', grad: 'from-danger/30 to-transparent' },
  { to: '/coinflip', icon: '🪙', name: 'games.coinflip', desc: 'coinflip.howItWorks', grad: 'from-gold/20 to-transparent' },
  { to: '/slots', icon: '🎰', name: 'games.slots', desc: '', grad: 'from-gold/20 to-transparent' },
  { to: '/plinko', icon: '⚪', name: 'games.plinko', desc: '', grad: 'from-felt/30 to-transparent' },
  { to: '/blackjack', icon: '🂡', name: 'games.blackjack', desc: '', grad: 'from-felt/30 to-transparent' },
  { to: '/dice', icon: '🎲', name: 'games.dice', desc: '', grad: 'from-gold/20 to-transparent' },
  { to: '/mines', icon: '💣', name: 'games.mines', desc: 'mines.howItWorks', grad: 'from-danger/30 to-transparent' },
  { to: '/hilo', icon: '🃏', name: 'games.hilo', desc: 'hilo.howItWorks', grad: 'from-gold/20 to-transparent' },
];

export default function Home() {
  const { t } = useTranslation();
  const { user, setAuthOpen } = useUser();
  const [events, setEvents] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);

  useEffect(() => {
    api.get('/sports/events').then((r) => setEvents(r.data.events.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6">
      {/* Hero */}
      <section className="dbet-card relative overflow-hidden p-6 md:p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-deep via-deep/60 to-transparent" />
        <div className="relative">
          <p className="dbet-label text-gold">{t('tagline')}</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl text-ink md:text-5xl">{t('home.heroTitle')}</h1>
          <p className="mt-3 max-w-xl text-ink-muted">{t('home.heroText')}</p>
          <div className="mt-5 flex gap-3">
            <Link to="/crash" className="dbet-btn-gold">
              {t('home.ctaPlay')}
            </Link>
            {!user && (
              <button className="dbet-btn-ghost" onClick={() => setAuthOpen(true)}>
                {t('nav.login')}
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-ink-faint">{t('legalNotice')}</p>
        </div>
      </section>

      {/* Games grid */}
      <h2 className="mb-3 mt-8 font-display text-2xl text-gold">{t('home.featured')}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {GAME_CARDS.map((g) => (
          <Link
            key={g.to}
            to={g.to}
            className={`dbet-card group flex min-h-[120px] flex-col justify-between bg-gradient-to-b p-4 transition-transform hover:scale-[1.02] hover:border-gold ${g.grad}`}
          >
            <span className="text-4xl" role="img" aria-hidden>
              {g.icon}
            </span>
            <div>
              <p className="font-display text-lg text-ink group-hover:text-gold">{t(g.name)}</p>
              {g.desc && <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{t(g.desc)}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Sports highlights */}
      <h2 className="mb-3 mt-8 font-display text-2xl text-gold">🏆 {t('home.sportsHighlights')}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {events.map((ev) => {
          const market = ev.markets?.[0];
          return (
            <Link key={ev._id} to={`/sports/${ev._id}`} className="dbet-card p-4 hover:border-gold">
              <p className="dbet-label">{ev.sportTitle}</p>
              <p className="mt-1 font-semibold">
                {ev.homeTeam} <span className="text-ink-faint">vs</span> {ev.awayTeam}
              </p>
              {market && (
                <div className="mt-3 flex gap-2">
                  {market.outcomes.map((o: any) => (
                    <span key={o.key} className="dbet-chip odds" title={o.label}>
                      {o.key === 'draw' ? 'X' : o.key === 'home' ? '1' : '2'} · {fmtOdds(o.odds)}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
        {events.length === 0 && <p className="text-ink-muted">{t('sports.noEvents')}</p>}
      </div>
      <div className="mt-3">
        <Link to="/sports" className="dbet-btn-ghost">
          {t('nav.sports')} →
        </Link>
      </div>
    </div>
  );
}
