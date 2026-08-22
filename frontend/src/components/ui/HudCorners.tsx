/** Technical corner-bracket accent — the same motif used on the landing hero and auth panels. */
export default function HudCorners({
  only,
  className = '',
}: {
  /** Restrict to specific corners, e.g. when other UI (an edit button, overlay text) already sits in one. */
  only?: Array<'tl' | 'tr' | 'bl' | 'br'>;
  className?: string;
}) {
  const corners: Array<'tl' | 'tr' | 'bl' | 'br'> = only ?? ['tl', 'tr', 'bl', 'br'];
  return (
    <div className={`hud-corners ${className}`} aria-hidden>
      {corners.map((c) => (
        <span key={c} className={`hud-corner hud-${c}`} />
      ))}
    </div>
  );
}
