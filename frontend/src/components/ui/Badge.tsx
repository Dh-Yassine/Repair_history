import type { ReactNode } from 'react';

type Variant = 'verified' | 'declared' | 'neutral' | 'accent';

export default function Badge({
  variant = 'neutral',
  children,
  className = '',
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`ui-badge ui-badge--${variant} ${className}`.trim()}>{children}</span>;
}
