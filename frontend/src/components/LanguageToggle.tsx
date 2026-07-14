import { useLanguage } from '../i18n/LanguageContext';
import type { Locale } from '../i18n/utils';

const OPTIONS: { locale: Locale; flag: string; label: string }[] = [
  { locale: 'fr', flag: '🇫🇷', label: 'Français' },
  { locale: 'en', flag: '🇬🇧', label: 'English' },
];

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className={`lang-toggle ${compact ? 'lang-toggle-compact' : ''}`}
      role="group"
      aria-label={t('common.language')}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.locale}
          type="button"
          className={`lang-toggle-btn ${locale === opt.locale ? 'active' : ''}`}
          onClick={() => setLocale(opt.locale)}
          aria-pressed={locale === opt.locale}
          title={opt.label}
        >
          <span className="lang-toggle-flag" aria-hidden>
            {opt.flag}
          </span>
          {!compact && <span className="lang-toggle-code">{opt.locale.toUpperCase()}</span>}
        </button>
      ))}
    </div>
  );
}
