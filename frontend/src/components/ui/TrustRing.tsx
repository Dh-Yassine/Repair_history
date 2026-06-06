import { useEffect, useState } from 'react';

export default function TrustRing({ score, size = 120 }: { score: number; size?: number }) {
  const [offset, setOffset] = useState(0);
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));

  useEffect(() => {
    const target = circumference - (pct / 100) * circumference;
    const t = setTimeout(() => setOffset(target), 80);
    return () => clearTimeout(t);
  }, [pct, circumference]);

  const color = pct >= 70 ? 'var(--color-verified)' : pct >= 40 ? 'var(--color-accent)' : 'var(--color-warning)';

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} className="trust-ring">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="square"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span
        className="mono"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
