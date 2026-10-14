import { useTranslation } from 'react-i18next';
import type { SportEventStatus } from '../../types/sports';

export default function EventStatusBadge({ status }: { status: SportEventStatus }) {
  const { t } = useTranslation();
  if (status === 'live') {
    return <span className="dbet-chip animate-pulse border-danger text-danger">● {t('sports.live')}</span>;
  }
  if (status === 'finished') {
    return <span className="dbet-chip text-ink-muted">{t('sports.finished')}</span>;
  }
  return (
    <span className="dbet-chip text-ink-muted">{t(`sports.${status}`, { defaultValue: t('sports.scheduled') })}</span>
  );
}
