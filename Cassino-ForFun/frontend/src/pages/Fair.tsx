import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { useUser } from '../context/UserContext';

export default function Fair() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [seedInfo, setSeedInfo] = useState<any>(null);
  const [clientSeed, setClientSeed] = useState('');
  const [verify, setVerify] = useState({ serverSeed: '', clientSeed: '', nonce: '0' });
  const [result, setResult] = useState<number[] | null>(null);
  const [rounds, setRounds] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      api.get('/fair/seed').then((r) => {
        setSeedInfo(r.data);
        setClientSeed(r.data.clientSeed);
      });
    }
    api.get('/fair/live-rounds').then((r) => setRounds(r.data.items)).catch(() => {});
  }, [user]);

  async function rotate() {
    const { data } = await api.post('/fair/seed/rotate');
    setSeedInfo((s: any) => ({ ...s, serverSeedHash: data.serverSeedHash, nonce: 0 }));
    toast.success('✓');
  }
  async function saveClientSeed() {
    await api.post('/fair/seed/client', { clientSeed });
    toast.success('✓');
  }
  async function doVerify() {
    const { data } = await api.post('/fair/verify', {
      serverSeed: verify.serverSeed,
      clientSeed: verify.clientSeed,
      nonce: verify.nonce,
      count: 5,
    });
    setResult(data.floats);
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-6">
      <h1 className="font-display text-3xl text-gold">{t('fair.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('fair.intro')}</p>

      <div className="dbet-card mt-4 p-4">
        <p className="dbet-label mb-1">{t('fair.howTitle')}</p>
        <p className="text-sm text-ink-muted">{t('fair.how')}</p>
      </div>

      {user && seedInfo && (
        <div className="dbet-card mt-4 space-y-3 p-4">
          <div>
            <label className="dbet-label">{t('fair.clientSeed')}</label>
            <div className="mt-1 flex gap-2">
              <input className="dbet-input" value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} />
              <button className="dbet-btn-ghost" onClick={saveClientSeed}>
                {t('common.save')}
              </button>
            </div>
          </div>
          <div>
            <p className="dbet-label">{t('fair.serverSeedHash')}</p>
            <code className="mt-1 block break-all rounded bg-base p-2 text-xs text-gold">{seedInfo.serverSeedHash}</code>
          </div>
          <p className="text-sm text-ink-muted tabular">
            {t('fair.nonce')}: {seedInfo.nonce}
          </p>
          <button className="dbet-btn-gold" onClick={rotate}>
            {t('fair.rotate')}
          </button>
          {seedInfo.revealedSeeds?.length > 0 && (
            <div>
              <p className="dbet-label mb-1">{t('fair.revealed')}</p>
              {seedInfo.revealedSeeds.map((r: any, i: number) => (
                <div key={i} className="mb-1 break-all rounded bg-base p-2 text-xs">
                  seed: <span className="text-felt">{r.serverSeed}</span> · hash: <span className="text-gold">{r.serverSeedHash}</span> · nonce
                  final: {r.rotateAtNonce}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="dbet-card mt-4 p-4">
        <p className="dbet-label mb-2">{t('fair.verify')}</p>
        <div className="grid gap-2 md:grid-cols-3">
          <input className="dbet-input" placeholder="serverSeed" value={verify.serverSeed} onChange={(e) => setVerify({ ...verify, serverSeed: e.target.value })} />
          <input className="dbet-input" placeholder="clientSeed" value={verify.clientSeed} onChange={(e) => setVerify({ ...verify, clientSeed: e.target.value })} />
          <input className="dbet-input" placeholder="nonce" type="number" value={verify.nonce} onChange={(e) => setVerify({ ...verify, nonce: e.target.value })} />
        </div>
        <button className="dbet-btn-gold mt-2" onClick={doVerify}>
          {t('fair.check')}
        </button>
        {result && (
          <div className="mt-2 flex flex-wrap gap-1">
            {result.map((f, i) => (
              <span key={i} className="dbet-chip tabular">
                cursor {i}: {f.toFixed(8)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="dbet-card mt-4 p-4">
        <p className="dbet-label mb-2">Crash — {t('games.history')}</p>
        <div className="space-y-1 text-xs">
          {rounds.map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-2 border-b border-line/40 py-1">
              <span className="text-ink-faint">#{r.roundId}</span>
              <span className={`tabular font-bold ${r.result.crashPoint >= 2 ? 'text-felt' : 'text-danger'}`}>{r.result.crashPoint?.toFixed(2)}×</span>
              <span className="truncate text-ink-faint">seed: {r.serverSeed}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
