import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import Money, { fmtMoney } from '../components/Money';

export default function Profile() {
  const { t } = useTranslation();
  const { user, refresh, setAuthOpen } = useUser();
  const { id } = useParams();
  const [other, setOther] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [friendName, setFriendName] = useState('');
  const [friends, setFriends] = useState<any>({ friends: [], incoming: [], outgoing: [] });

  const isMe = !id || id === user?.id;

  useEffect(() => {
    if (!isMe && id) {
      api.get(`/users/profile/${id}`).then((r) => setOther(r.data.user)).catch(() => {});
    }
  }, [id, isMe]);

  useEffect(() => {
    if (user && isMe) {
      api.get('/users/me/transactions').then((r) => setTxs(r.data.items)).catch(() => {});
      api.get('/users/friends').then((r) => setFriends(r.data)).catch(() => {});
      setAvatarUrl(user.avatar || '');
    }
  }, [user, isMe]);

  if (!user && isMe) {
    return (
      <div className="mx-auto max-w-lg px-3 py-16 text-center">
        <p className="text-ink-muted">{t('profile.title')} — DBET</p>
        <button className="dbet-btn-gold mt-4" onClick={() => setAuthOpen(true)}>
          {t('nav.login')}
        </button>
      </div>
    );
  }

  const shown = isMe ? user : other;
  if (!shown) return <p className="p-8 text-center text-ink-muted">{t('common.loading')}</p>;

  async function saveAvatar() {
    try {
      await api.post('/users/me/avatar', { avatar: avatarUrl });
      toast.success('✓');
      refresh();
    } catch {
      toast.error(t('common.error'));
    }
  }

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/users/friends/${friendName}/request`);
      toast.success('✓');
      setFriendName('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    }
  }
  async function accept(username: string) {
    await api.post(`/users/friends/${username}/accept`).catch(() => {});
    const r = await api.get('/users/friends');
    setFriends(r.data);
  }

  const balance = isMe ? (user?.balance ?? 0) : undefined;

  return (
    <div className="mx-auto max-w-4xl px-3 py-6">
      <div className="dbet-card flex flex-wrap items-center gap-4 p-5">
        {shown.avatar ? (
          <img src={shown.avatar} alt="" className="h-16 w-16 rounded-full border-2 border-gold object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold font-display text-2xl text-base">
            {shown.username[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="font-display text-2xl text-gold">{shown.username}</h1>
          <p className="text-sm text-ink-muted">
            {t('profile.level')} {shown.level}
            {shown.createdAt && ` · ${t('profile.joined')} ${new Date(shown.createdAt).toLocaleDateString()}`}
          </p>
        </div>
        {balance !== undefined && (
          <div className="dbet-chip text-base">
            <Money cents={balance} className="font-bold text-gold" />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t('profile.totalBets'), value: String(shown.stats?.bets ?? 0) },
          { label: t('profile.wagered'), value: fmtMoney(shown.stats?.wagered ?? 0) },
          { label: t('profile.won'), value: fmtMoney(shown.stats?.won ?? 0) },
          { label: t('profile.biggestWin'), value: fmtMoney(shown.stats?.biggestWin ?? 0) },
        ].map((s) => (
          <div key={s.label} className="dbet-card p-3 text-center">
            <p className="dbet-label">{s.label}</p>
            <p className="mt-1 font-display text-xl text-ink tabular">{s.value}</p>
          </div>
        ))}
      </div>

      {isMe && (
        <>
          {/* Avatar */}
          <div className="dbet-card mt-4 p-4">
            <label className="dbet-label" htmlFor="avatar-url">
              {t('profile.changeAvatar')}
            </label>
            <div className="mt-2 flex gap-2">
              <input id="avatar-url" className="dbet-input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
              <button className="dbet-btn-gold" onClick={saveAvatar}>
                {t('common.save')}
              </button>
            </div>
          </div>

          {/* Amigos */}
          <div className="dbet-card mt-4 p-4">
            <p className="dbet-label mb-2">{t('profile.friends')}</p>
            <form onSubmit={addFriend} className="mb-3 flex gap-2">
              <input className="dbet-input" placeholder={t('auth.username')} value={friendName} onChange={(e) => setFriendName(e.target.value)} />
              <button className="dbet-btn-ghost" type="submit">
                {t('profile.addFriend')}
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {friends.friends.map((f: any) => (
                <span key={f._id} className="dbet-chip">
                  {f.username} · Lv {f.level}
                </span>
              ))}
              {friends.incoming.map((f: any) => (
                <span key={f._id} className="dbet-chip border-gold">
                  {f.username}
                  <button className="text-gold" onClick={() => accept(f.username)}>
                    {t('profile.accept')}
                  </button>
                </span>
              ))}
              {friends.friends.length === 0 && friends.incoming.length === 0 && (
                <p className="text-xs text-ink-faint">{t('chat.empty')}</p>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="dbet-card mt-4 p-4">
            <p className="dbet-label mb-2">{t('profile.history')}</p>
            <div className="max-h-72 space-y-1 overflow-y-auto text-sm">
              {txs.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between border-b border-line/40 py-1">
                  <span className="text-ink-muted">
                    {tx.game || tx.type} <span className="text-ink-faint text-xs">{new Date(tx.createdAt).toLocaleString()}</span>
                  </span>
                  <span className={`tabular font-semibold ${tx.amount >= 0 ? 'text-felt' : 'text-danger'}`}>
                    {tx.amount >= 0 ? '+' : ''}
                    {fmtMoney(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
