import { useTranslation } from 'react-i18next';
import { fmtMoney } from '../Money';

interface Props {
  value: number; // centavos
  onChange: (cents: number) => void;
  disabled?: boolean;
}

const QUICK = [100, 500, 1000, 5000];

export default function BetAmount({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="dbet-label">{t('games.betAmount')}</label>
      <div className="mt-1 flex items-center gap-2">
        <button className="dbet-btn-ghost px-3" disabled={disabled} onClick={() => onChange(Math.max(100, Math.floor(value / 2)))} aria-label="dividir">
          ½
        </button>
        <input
          type="number"
          min={1}
          className="dbet-input text-center"
          value={(value / 100).toString()}
          disabled={disabled}
          onChange={(e) => onChange(Math.max(0, Math.round(parseFloat(e.target.value.replace(',', '.')) * 100)) || 0)}
        />
        <button className="dbet-btn-ghost px-3" disabled={disabled} onClick={() => onChange(Math.min(10_000_000, value * 2))} aria-label="dobrar">
          2×
        </button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {QUICK.map((q) => (
          <button key={q} className="dbet-chip justify-center hover:border-gold min-h-[36px]" disabled={disabled} onClick={() => onChange(q)}>
            {fmtMoney(q)}
          </button>
        ))}
      </div>
    </div>
  );
}
