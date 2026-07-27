import type { ReactNode, HTMLAttributes } from 'react';

export default function Card({
  children,
  className = '',
  raised = false,
  padded = true,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
  padded?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`ui-card ${raised ? 'ui-card--raised' : ''} ${padded ? 'ui-card--padded' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
