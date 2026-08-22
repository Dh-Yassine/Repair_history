import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Every page is wrapped in a `PageTransition` motion.div, which keeps a CSS
 * transform applied for its lifetime. That transform makes the page content
 * the containing block for any `position: fixed` descendant, so a fixed
 * overlay rendered inline loses its viewport-level stacking and paints
 * behind the app shell's sticky topbar instead of above it. Portaling to
 * `document.body` escapes that and restores true fixed/topmost behavior.
 */
export default function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
