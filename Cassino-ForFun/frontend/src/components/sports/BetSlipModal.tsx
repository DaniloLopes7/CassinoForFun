import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';
import Money from '../Money';
import BetAmount from '../game/BetAmount';
import { fmtOdds } from '../../utils/odds';
import type { OutcomeKey } from '../../types/sports';

export interface BetTarget {
  marketId: string;
  outcome: OutcomeKey;
  outcomeLabel: string;
  odds: number;
  eventTitle: string;
}

// Modal de aposta esportiva (stake em centavos). Reutilizado por Sports e SportsEvent.
export default function BetSlipModal({ target, onClose }: { target: BetTarget | null; onClose: () => void }) {
  if (!target) return null;
  // key: remonta o form a cada nova selecao (reseta o stake)
  return <Slip key={`${target.marketId}:${target.outcome}`} target={target} onClose={onClose} />;
}

function Slip({ target, onClose }: { target: BetTarget; onClose: () => void }) {
  const { t } = useTranslation();
  const { refresh } = useUser();
  const [stake, setStake] = useState(500); // centavos
  const [busy, setBusy] = useState(false);

  const potentialPayout = Math.floor(stake * target.odds);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post('/sports/bet', { marketId: target.marketId, outcome: target.outcome, stake });
      toast.success(`✅ ${t('sports.placeBet')}: ${target.outcomeLabel} @ ${fmtOdds(target.odds)}`);
      await refresh();
      onClose();
    } catch (e: any) {
      const code = e?.response?.data?.error || 'server_error';
      toast.error(t(`errors.${code}`, { defaultValue: code }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="dbet-card w-full max-w-sm animate-pop p-5" onClick={(e) => e.stopPropagation()}>
        <p className="dbet-label">{t('sports.placeBet')}</p>
        <p className="mt-1 font-semibold">{target.eventTitle}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {target.outcomeLabel} · <span className="tabular text-gold">{fmtOdds(target.odds)}</span>
        </p>

        <div className="mt-4">
          <BetAmount value={stake} onChange={setStake} disabled={busy} />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="dbet-label">{t('sports.potentialPayout')}</span>
          <Money cents={potentialPayout} className="text-gold" />
        </div>

        <div className="mt-4 flex gap-2">
          <button className="dbet-btn-ghost flex-1" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button className="dbet-btn-gold flex-1" onClick={confirm} disabled={busy || stake < 1}>
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
