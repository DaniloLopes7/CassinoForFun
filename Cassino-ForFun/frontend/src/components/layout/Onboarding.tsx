import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../context/UserContext';

const KEY = 'dbet.onboarded';

const STEPS = [
  { icon: '🎰', titleKey: 'brand', textKey: 'tagline' },
  { icon: '🪙', titleKey: 'common.balance', textKey: 'home.heroText' },
  { icon: '🏆', titleKey: 'nav.sports', textKey: 'home.sportsHighlights' },
];

/** Onboarding rapido (3 telas) mostrado na primeira visita */
export default function Onboarding() {
  const { t } = useTranslation();
  const { setAuthOpen, user } = useUser();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(KEY) !== '1') {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!open) return null;

  function close() {
    localStorage.setItem(KEY, '1');
    setOpen(false);
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="dbet-card w-full max-w-sm p-6 text-center animate-pop">
        <div className="text-6xl" aria-hidden>
          {s.icon}
        </div>
        <h2 className="mt-3 font-display text-2xl text-gold">{t(s.titleKey)}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t(s.textKey)}</p>
        <p className="mt-2 text-xs text-ink-faint">{t('legalNotice')}</p>

        <div className="mt-4 flex items-center justify-center gap-1">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 w-6 rounded-full ${i === step ? 'bg-gold' : 'bg-line'}`} />
          ))}
        </div>

        <div className="mt-4 flex justify-between">
          <button className="dbet-btn-ghost" onClick={close}>
            {t('common.close')}
          </button>
          {last ? (
            <button
              className="dbet-btn-gold"
              onClick={() => {
                close();
                if (!user) setAuthOpen(true);
              }}
            >
              {t('home.ctaPlay')}
            </button>
          ) : (
            <button className="dbet-btn-gold" onClick={() => setStep(step + 1)}>
              →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
