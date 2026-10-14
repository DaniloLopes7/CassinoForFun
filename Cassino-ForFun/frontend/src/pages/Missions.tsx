import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { TFunction } from 'i18next';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';
import Money, { fmtMoney } from '../components/Money';

interface Mission {
  id: string;
  nameKey: string;
  goal: number;
  stat: string;
  reward: number; // centavos
  progress: number;
  done: boolean;
  claimed: boolean;
}

// 'missions.firstBet' -> 'First Bet' (fallback legivel quando a chave nao existe nos locales)
function missionName(m: Mission, t: TFunction): string {
  const tail = m.nameKey.split('.').pop() || m.nameKey;
  const fallback = tail.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
  return t(m.nameKey, { defaultValue: fallback });
}

export default function Missions() {
  const { t } = useTranslation();
  const { user, loading, setAuthOpen, refresh } = useUser();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      const { data } = await api.get('/missions');
      setMissions(data.missions || []);
    } catch {
      /* sem missoes */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) fetchMissions();
  }, [user, fetchMissions]);

  const claim = async (m: Mission) => {
    if (!user) return setAuthOpen(true);
    if (busyId) return;
    setBusyId(m.id);
    try {
      const { data } = await api.post(`/missions/${m.id}/claim`);
      toast.success(`+${fmtMoney(data.reward)}`);
      await refresh();
      await fetchMissions();
    } catch (e: any) {
      const code = e?.response?.data?.error || 'server_error';
      toast.error(t(`errors.${code}`, { defaultValue: code }));
    } finally {
      setBusyId(null);
    }
  };

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
          <h1 className="font-display text-2xl text-gold">{t('missions.title')}</h1>
          <button className="dbet-btn-gold mt-4" onClick={() => setAuthOpen(true)}>
            {t('nav.login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-6">
      <h1 className="font-display text-2xl text-gold md:text-3xl">{t('missions.title')}</h1>

      <div className="mt-4 grid gap-3">
        {missions.map((m) => {
          const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.goal)) * 100));
          return (
            <div key={m.id} className="dbet-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{missionName(m, t)}</p>
                  <p className="mt-1 text-xs tabular text-ink-muted">
                    {t('missions.progress')}: {Math.min(m.progress, m.goal)}/{m.goal}
                  </p>
                </div>
                <Money cents={m.reward} className="shrink-0 text-gold" />
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-3 flex justify-end">
                {m.claimed ? (
                  <span className="dbet-chip text-ink-muted">✓ {t('missions.claimed')}</span>
                ) : m.done ? (
                  <button className="dbet-btn-gold" onClick={() => claim(m)} disabled={busyId === m.id}>
                    {t('missions.claim')}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {loaded && missions.length === 0 && <p className="mt-6 text-ink-muted">{t('missions.title')} — 0</p>}
      </div>
    </div>
  );
}
