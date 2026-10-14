import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import Money, { fmtMoney } from '../components/Money';

function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;
}

function errCode(e: any): string {
  return e?.response?.data?.error || 'server_error';
}

export default function Gifts() {
  const { t } = useTranslation();
  const { user, loading, setAuthOpen, refresh } = useUser();
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busyDaily, setBusyDaily] = useState(false);
  const [busyNet, setBusyNet] = useState(false);

  // tick do countdown ate o proximo bonus
  useEffect(() => {
    if (!nextAt) return;
    const iv = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (nextAt - n <= 0) setNextAt(null);
    }, 1000);
    return () => clearInterval(iv);
  }, [nextAt]);

  const claimDaily = async () => {
    if (!user) return setAuthOpen(true);
    if (busyDaily) return;
    setBusyDaily(true);
    try {
      const { data } = await api.post('/users/me/daily-bonus');
      setClaimedAmount(data.amount);
      setStreak(data.streak);
      toast.success(`+${fmtMoney(data.amount)}`);
      await refresh();
    } catch (e: any) {
      const nx = e?.response?.data?.nextAt;
      if (e?.response?.status === 429 && nx) {
        const ts = typeof nx === 'number' ? nx : new Date(nx).getTime();
        setNextAt(ts);
        setNow(Date.now());
      } else {
        toast.error(t(`errors.${errCode(e)}`, { defaultValue: errCode(e) }));
      }
    } finally {
      setBusyDaily(false);
    }
  };

  const claimSafetyNet = async () => {
    if (!user) return setAuthOpen(true);
    if (busyNet) return;
    setBusyNet(true);
    try {
      const { data } = await api.post('/users/me/safety-net');
      toast.success(`🛟 ${t('gifts.safetyNetReceived')} +${fmtMoney(data.amount)}`);
      await refresh();
    } catch (e: any) {
      toast.error(t(`errors.${errCode(e)}`, { defaultValue: errCode(e) }));
    } finally {
      setBusyNet(false);
    }
  };

  const streakDays = Math.min(streak ?? user?.dailyStreak ?? 0, 7);

  return (
    <div className="mx-auto max-w-4xl px-3 py-6">
      <h1 className="font-display text-2xl text-gold md:text-3xl">{t('gifts.title')}</h1>

      {/* Bonus diario */}
      <section className="dbet-card mt-4 border-gold/30 p-6 text-center">
        <p className="dbet-label text-gold">{t('gifts.daily')}</p>

        {claimedAmount != null ? (
          <div className="mt-4">
            <p className="font-display text-4xl tabular text-gold">
              <Money cents={claimedAmount} />
            </p>
            <p className="mt-2 text-sm text-ink-muted">{t('gifts.claimed')}</p>
          </div>
        ) : nextAt ? (
          <div className="mt-4">
            <p className="text-sm text-ink-muted">{t('gifts.nextIn')}</p>
            <p className="mt-1 font-display text-3xl tabular text-gold">{fmtCountdown(nextAt - now)}</p>
          </div>
        ) : (
          <button
            className="dbet-btn-gold mt-4 px-8 text-lg"
            onClick={claimDaily}
            disabled={busyDaily || loading}
          >
            {t('gifts.claim')}
          </button>
        )}

        {/* Streak de 7 dias */}
        <p className="dbet-label mt-6">
          {t('gifts.streak')} · {streakDays}/7
        </p>
        <div className="mt-2 flex justify-center gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={`flex h-12 w-10 flex-col items-center justify-center rounded-lg border ${
                i < streakDays ? 'border-gold bg-gold/15 text-gold' : 'border-line bg-surface text-ink-faint'
              }`}
            >
              <span className="text-[10px] uppercase">{t('gifts.day')}</span>
              <span className="font-bold tabular">{i + 1}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Safety net */}
      <section className="dbet-card mt-4 p-6 text-center">
        <p className="dbet-label text-felt">{t('gifts.safetyNet')}</p>
        {user && user.balance === 0 ? (
          <button className="dbet-btn-felt mt-4 px-8" onClick={claimSafetyNet} disabled={busyNet}>
            {t('gifts.claim')}
          </button>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">{t('gifts.safetyNet')}</p>
        )}
      </section>
    </div>
  );
}
