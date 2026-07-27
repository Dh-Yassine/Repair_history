import { Check, FileText } from 'lucide-react';

type Variant = 'verified' | 'declared';

export default function StampBadge({
  variant,
  label,
  size = 'md',
}: {
  variant: Variant;
  label: string;
  size?: 'sm' | 'md';
}) {
  if (variant === 'verified') {
    return (
      <span className={`stamp-badge stamp-badge--verified stamp-badge--${size}`} title={label}>
        <span className="stamp-badge__seal" aria-hidden>
          <Check size={size === 'sm' ? 11 : 14} strokeWidth={2.5} />
        </span>
        <span className="stamp-badge__label">{label}</span>
      </span>
    );
  }

  return (
    <span className={`stamp-badge stamp-badge--declared stamp-badge--${size}`} title={label}>
      <FileText size={size === 'sm' ? 11 : 13} aria-hidden />
      <span className="stamp-badge__label">{label}</span>
    </span>
  );
}
