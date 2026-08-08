import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { BackTarget } from '../../lib/pageBack';

type Props = {
  target: BackTarget;
  label?: string;
  className?: string;
};

export default function PageBackButton({ target, label, className = '' }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const text = label ?? t('common.back');

  function goBack() {
    if ('history' in target) {
      if (window.history.length > 1) navigate(-1);
      else navigate('/');
      return;
    }
    navigate(target.to);
  }

  if ('to' in target) {
    return (
      <Link to={target.to} className={`page-back-btn ${className}`.trim()} aria-label={text}>
        <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        <span className="page-back-btn__label">{text}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={`page-back-btn ${className}`.trim()} onClick={goBack} aria-label={text}>
      <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
      <span className="page-back-btn__label">{text}</span>
    </button>
  );
}
