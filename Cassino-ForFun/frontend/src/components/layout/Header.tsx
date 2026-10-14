import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../context/UserContext';
import Money from '../Money';
import { FaBars, FaSignOutAlt, FaTrophy, FaGift, FaHome } from 'react-icons/fa';
import LanguageSelector from './LanguageSelector';

export const GAME_LINKS = [
  { to: '/crash', key: 'games.crash' },
  { to: '/coinflip', key: 'games.coinflip' },
  { to: '/slots', key: 'games.slots' },
  { to: '/plinko', key: 'games.plinko' },
  { to: '/blackjack', key: 'games.blackjack' },
  { to: '/dice', key: 'games.dice' },
  { to: '/mines', key: 'games.mines' },
  { to: '/hilo', key: 'games.hilo' },
] as const;

function SoundToggle() {
  const [on, setOn] = useState(() => localStorage.getItem('dbet.sound') !== '0');
  return (
    <button
      className="dbet-btn-ghost px-3"
      aria-label={on ? 'Desativar som' : 'Ativar som'}
      title={on ? 'Som: ligado' : 'Som: desligado'}
      onClick={() => {
        const next = !on;
        setOn(next);
        localStorage.setItem('dbet.sound', next ? '1' : '0');
      }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

export default function Header() {
  const { t } = useTranslation();
  const { user, logout, setAuthOpen } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItem = 'rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink hover:bg-surface min-h-[44px] flex items-center';
  const navActive = 'text-gold bg-surface';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3">
        <button className="dbet-btn-ghost px-3 md:hidden min-h-[44px]" onClick={() => setMenuOpen(!menuOpen)} aria-label="menu">
          <FaBars />
        </button>
        <Link to="/" className="flex items-center gap-2 font-display text-2xl text-gold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-dim text-base font-black">D</span>
          DBET
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {GAME_LINKS.map((g) => (
            <NavLink key={g.to} to={g.to} className={({ isActive }) => `${navItem} ${isActive ? navActive : ''}`}>
              {t(g.key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <NavLink to="/sports" className={({ isActive }) => `hidden md:flex ${navItem} ${isActive ? navActive : ''}`}>
          🏆 {t('nav.sports')}
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `hidden lg:flex ${navItem} ${isActive ? navActive : ''}`}>
          <FaTrophy />
        </NavLink>
        <NavLink to="/gifts" className={({ isActive }) => `hidden lg:flex ${navItem} ${isActive ? navActive : ''}`}>
          <FaGift />
        </NavLink>
        {user?.role === 'admin' && (
          <NavLink to="/backoffice" className={({ isActive }) => `hidden lg:flex ${navItem} ${isActive ? navActive : ''}`}>
            ⚙️
          </NavLink>
        )}
        <LanguageSelector />
        <SoundToggle />

        {user ? (
          <div className="flex items-center gap-2">
            <div className="dbet-chip" title={t('common.balanceFictional')}>
              <span className="inline-block h-4 w-4 rounded-full bg-gradient-to-br from-gold-bright to-gold-dim" />
              <Money cents={user.balance} className="font-bold text-gold" />
            </div>
            <div className="dbet-chip" title="Nível">
              Lv {user.level}
            </div>
            <Link to="/profile" className="dbet-btn-ghost px-3 py-1.5 text-sm">
              {user.username}
            </Link>
            <button className="dbet-btn-ghost px-3" onClick={logout} aria-label={t('nav.logout')} title={t('nav.logout')}>
              <FaSignOutAlt />
            </button>
          </div>
        ) : (
          <button className="dbet-btn-gold" onClick={() => setAuthOpen(true)}>
            {t('nav.login')}
          </button>
        )}
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-deep p-2 md:hidden">
          <NavLink to="/" onClick={() => setMenuOpen(false)} className={navItem}>
            <FaHome className="mr-2" /> {t('nav.home')}
          </NavLink>
          <NavLink to="/sports" onClick={() => setMenuOpen(false)} className={navItem}>
            🏆 {t('nav.sports')}
          </NavLink>
          {GAME_LINKS.map((g) => (
            <NavLink key={g.to} to={g.to} onClick={() => setMenuOpen(false)} className={navItem}>
              {t(g.key)}
            </NavLink>
          ))}
          <NavLink to="/leaderboard" onClick={() => setMenuOpen(false)} className={navItem}>
            {t('nav.leaderboard')}
          </NavLink>
          <NavLink to="/gifts" onClick={() => setMenuOpen(false)} className={navItem}>
            {t('nav.gifts')}
          </NavLink>
          <NavLink to="/missions" onClick={() => setMenuOpen(false)} className={navItem}>
            {t('nav.missions')}
          </NavLink>
          <NavLink to="/fair" onClick={() => setMenuOpen(false)} className={navItem}>
            {t('nav.provablyFair')}
          </NavLink>
        </nav>
      )}
    </header>
  );
}
