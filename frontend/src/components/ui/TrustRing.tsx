import { useEffect, useState } from 'react';

/**
 * Gauge for the share of a vehicle's records confirmed by a workshop.
 * Only the two record colours are used — a mostly-declared history reads amber,
 * a workshop-backed one reads green. Lime stays reserved for calls to action.
 */
export default function TrustRing({ score, size = 120 }: { score: number; size?: number }) {
  const stroke = Math.max(6, Math.round(size / 14));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, Math.round(score)));

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const target = circumference - (pct / 100) * circumference;
    const t = setTimeout(() => setOffset(target), 80);
    return () => clearTimeout(t);
  }, [pct, circumference]);

  const color = pct >= 70 ? 'var(--verified)' : 'var(--declared)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} className="trust-ring" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(237, 235, 228, 0.11)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="mono"
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
          }}
        >
          <span style={{ fontSize: Math.round(size / 3.4), lineHeight: 1 }}>{pct}</span>
          <span style={{ fontSize: Math.round(size / 8), color: 'var(--text-muted)' }}>%</span>
        </span>
      </span>
    </div>
  );
}
