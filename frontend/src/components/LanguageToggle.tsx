import { useLanguage } from '../i18n/LanguageContext';
import type { Locale } from '../i18n/utils';

/** Image flags (Twemoji CDN) — flag emojis often fail on Windows and show as FR/GB. */
const OPTIONS: { locale: Locale; flagSrc: string; label: string; code: string }[] = [
  {
    locale: 'fr',
    flagSrc: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1eb-1f1f7.svg',
    label: 'Français',
    code: 'FR',
  },
  {
    locale: 'en',
    flagSrc: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ec-1f1e7.svg',
    label: 'English',
    code: 'EN',
  },
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
          <img
            className="lang-toggle-flag-img"
            src={opt.flagSrc}
            alt=""
            width={20}
            height={20}
            draggable={false}
          />
          {!compact && <span className="lang-toggle-code">{opt.code}</span>}
        </button>
      ))}
    </div>
  );
}
