import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../../i18n';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  return (
    <select
      aria-label="Language"
      className="min-h-[44px] rounded-lg border border-line bg-surface px-2 text-sm text-ink"
      value={i18n.language?.slice(0, 2) || 'pt'}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => i18n.changeLanguage(e.target.value)}
    >
      {LANGUAGES.map((l: { code: string; name: string }) => (
        <option key={l.code} value={l.code}>
          {l.name}
        </option>
      ))}
    </select>
  );
}
