import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export default function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  minLength = 8,
  required = true,
  showHint = true,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  showHint?: boolean;
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label className="label" htmlFor={id}>{t('auth.password')}</label>
      <div className="password-field">
        <input
          id={id}
          className="input password-field__input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          <span>{visible ? t('auth.hidePassword') : t('auth.showPassword')}</span>
        </button>
      </div>
      {showHint && (
        <p className="password-field__hint">{t('auth.passwordHint')}</p>
      )}
    </div>
  );
}
