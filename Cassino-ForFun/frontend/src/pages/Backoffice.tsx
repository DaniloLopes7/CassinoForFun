import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import Money, { fmtMoney } from '../components/Money';

type Tab = 'stats' | 'users' | 'sports' | 'txs';

export default function Backoffice() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [adjust, setAdjust] = useState<{ id: string; amount: string }>({ id: '', amount: '' });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'stats') api.get('/admin/stats').then((r) => setStats(r.data)).catch(() => {});
    if (tab === 'users') api.get('/admin/users', { params: { q } }).then((r) => setUsers(r.data.items)).catch(() => {});
    if (tab === 'sports') api.get('/admin/sports/events').then((r) => setEvents(r.data.events)).catch(() => {});
    if (tab === 'txs') api.get('/admin/transactions').then((r) => setTxs(r.data.items)).catch(() => {});
  }, [tab, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-3 py-16 text-center">
        <p className="text-danger">{t('backoffice.forbidden')}</p>
      </div>
    );
  }

  async function setRole(id: string, role: string) {
    await api.post(`/admin/users/${id}/role`, { role }).then(() => toast.success('✓')).catch(() => toast.error(t('common.error')));
    const r = await api.get('/admin/users', { params: { q } });
    setUsers(r.data.items);
  }
  async function setBan(id: string, banned: boolean) {
    const reason = banned ? (prompt('Motivo') || '') : '';
    await api.post(`/admin/users/${id}/ban`, { banned, reason }).then(() => toast.success('✓')).catch(() => toast.error(t('common.error')));
    const r = await api.get('/admin/users', { params: { q } });
    setUsers(r.data.items);
  }
  async function doAdjust(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(adjust.amount.replace(',', '.')) * 100);
    try {
      await api.post(`/admin/users/${adjust.id}/adjust`, { amount: cents });
      toast.success('✓');
      setAdjust({ id: '', amount: '' });
      const r = await api.get('/admin/users', { params: { q } });
      setUsers(r.data.items);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    }
  }
  async function syncNow() {
    const { data } = await api.post('/admin/sports/sync');
    toast.success(`${t('backoffice.syncResult')}: ${data.synced} (${data.demo ? 'demo' : 'API'})`);
    const r = await api.get('/admin/sports/events');
    setEvents(r.data.events);
  }
  async function resolveEvent(id: string) {
    const hs = prompt('Placar casa (ex: 2)');
    const as = prompt('Placar fora (ex: 1)');
    if (hs == null || as == null) return;
    await api.post(`/admin/sports/events/${id}/resolve`, { homeScore: hs, awayScore: as }).then(() => toast.success('✓')).catch(() => toast.error(t('common.error')));
    const r = await api.get('/admin/sports/events');
    setEvents(r.data.events);
  }
  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/admin/sports/events', {
        sportKey: String(fd.get('sportKey') || 'manual'),
        homeTeam: String(fd.get('homeTeam')),
        awayTeam: String(fd.get('awayTeam')),
        startsAt: new Date(String(fd.get('startsAt'))).toISOString(),
        outcomes: [
          { key: 'home', label: String(fd.get('homeTeam')), odds: Number(fd.get('oddsHome')) },
          { key: 'draw', label: 'Empate', odds: Number(fd.get('oddsDraw')) },
          { key: 'away', label: String(fd.get('awayTeam')), odds: Number(fd.get('oddsAway')) },
        ].filter((o) => !isNaN(o.odds) && o.odds >= 1.01),
      });
      toast.success('✓');
      const r = await api.get('/admin/sports/events');
      setEvents(r.data.events);
    } catch {
      toast.error(t('common.error'));
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stats', label: t('backoffice.stats') },
    { key: 'users', label: t('backoffice.users') },
    { key: 'sports', label: t('backoffice.sportsAdmin') },
    { key: 'txs', label: t('backoffice.transactions') },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 py-6">
      <h1 className="font-display text-3xl text-gold">⚙️ {t('backoffice.title')}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            className={`dbet-chip min-h-[36px] ${tab === tb.key ? 'border-gold text-gold' : ''}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: t('backoffice.totalUsers'), value: String(stats.users) },
            { label: t('backoffice.totalBets'), value: String(stats.bets) },
            { label: t('backoffice.totalWagered'), value: fmtMoney(stats.wagered) },
            { label: t('backoffice.sportBets'), value: String(stats.sportBets) },
          ].map((s) => (
            <div key={s.label} className="dbet-card p-4 text-center">
              <p className="dbet-label">{s.label}</p>
              <p className="mt-1 font-display text-2xl tabular">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="mt-4">
          <form className="mb-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              className="dbet-input"
              placeholder={t('backoffice.searchUser')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button
              className="dbet-btn-ghost"
              onClick={() => api.get('/admin/users', { params: { q } }).then((r) => setUsers(r.data.items))}
            >
              🔍
            </button>
          </form>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u._id} className="dbet-card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="font-semibold">{u.username}</span>
                <span className={`dbet-chip ${u.role === 'admin' ? 'border-gold text-gold' : u.role === 'moderator' ? 'border-felt text-felt' : ''}`}>{u.role}</span>
                {u.banned && <span className="dbet-chip border-danger text-danger">BAN</span>}
                <Money cents={u.balance} className="text-ink-muted" />
                <span className="text-ink-faint text-xs">Lv {u.level}</span>
                <div className="ml-auto flex flex-wrap gap-1">
                  {u.role !== 'admin' && (
                    <button className="dbet-chip hover:border-gold" onClick={() => setRole(u._id, 'admin')}>
                      {t('backoffice.makeAdmin')}
                    </button>
                  )}
                  {u.role !== 'user' && (
                    <button className="dbet-chip hover:border-gold" onClick={() => setRole(u._id, 'user')}>
                      {t('backoffice.makeUser')}
                    </button>
                  )}
                  <button className="dbet-chip hover:border-gold" onClick={() => setAdjust({ id: u._id, amount: '' })}>
                    {t('backoffice.adjustBalance')}
                  </button>
                  {u.banned ? (
                    <button className="dbet-chip border-felt text-felt" onClick={() => setBan(u._id, false)}>
                      {t('backoffice.unban')}
                    </button>
                  ) : (
                    <button className="dbet-chip border-danger text-danger" onClick={() => setBan(u._id, true)}>
                      {t('backoffice.ban')}
                    </button>
                  )}
                </div>
                {adjust.id === u._id && (
                  <form onSubmit={doAdjust} className="flex w-full gap-2">
                    <input className="dbet-input" placeholder="±1000.00" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} />
                    <button className="dbet-btn-gold">{t('common.confirm')}</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'sports' && (
        <div className="mt-4">
          <button className="dbet-btn-gold mb-3" onClick={syncNow}>
            🔄 {t('backoffice.syncNow')}
          </button>

          <details className="dbet-card mb-4 p-4">
            <summary className="cursor-pointer font-semibold text-gold">＋ {t('backoffice.createEvent')}</summary>
            <form onSubmit={createEvent} className="mt-3 grid gap-2 md:grid-cols-2">
              <input name="sportKey" className="dbet-input" placeholder="sportKey (ex: soccer_epl)" />
              <input name="startsAt" type="datetime-local" className="dbet-input" required />
              <input name="homeTeam" className="dbet-input" placeholder={t('sports.home')} required />
              <input name="awayTeam" className="dbet-input" placeholder={t('sports.away')} required />
              <input name="oddsHome" className="dbet-input" placeholder={`Odd ${t('sports.home')} (ex 1.85)`} required />
              <input name="oddsAway" className="dbet-input" placeholder={`Odd ${t('sports.away')} (ex 3.20)`} required />
              <input name="oddsDraw" className="dbet-input" placeholder={`Odd ${t('sports.draw')} (opcional)`} />
              <button className="dbet-btn-gold">{t('common.confirm')}</button>
            </form>
          </details>

          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev._id} className="dbet-card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="dbet-chip">{ev.sportTitle || ev.sportKey}</span>
                <span className="font-semibold">
                  {ev.homeTeam} vs {ev.awayTeam}
                </span>
                <span className="text-xs text-ink-faint">{new Date(ev.startsAt).toLocaleString()}</span>
                <span className={`dbet-chip ${ev.status === 'live' ? 'border-danger text-danger' : ev.status === 'finished' ? 'border-felt text-felt' : ''}`}>
                  {ev.status}
                  {ev.homeScore != null ? ` ${ev.homeScore}–${ev.awayScore}` : ''}
                </span>
                {ev.status !== 'finished' && ev.status !== 'cancelled' && (
                  <button className="dbet-chip ml-auto hover:border-gold" onClick={() => resolveEvent(ev._id)}>
                    {t('backoffice.resolve')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'txs' && (
        <div className="mt-4 space-y-1 text-sm">
          {txs.map((tx) => (
            <div key={tx._id} className="flex items-center justify-between border-b border-line/40 py-1">
              <span className="text-ink-muted">
                {tx.user?.username} · {tx.type} {tx.game && `· ${tx.game}`}
                <span className="text-ink-faint text-xs"> {new Date(tx.createdAt).toLocaleString()}</span>
              </span>
              <span className={`tabular font-semibold ${tx.amount >= 0 ? 'text-felt' : 'text-danger'}`}>
                {fmtMoney(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
