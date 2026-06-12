import { useEffect } from 'react';

/** Lock body scroll + track virtual keyboard inset for drawers/modals on mobile */
export function useOverlayPanel(open: boolean, onClose: () => void, closeOnEscape = true) {
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    const vv = window.visualViewport;
    const syncKeyboardInset = () => {
      if (!vv) {
        document.documentElement.style.setProperty('--keyboard-inset', '0px');
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
    };

    vv?.addEventListener('resize', syncKeyboardInset);
    vv?.addEventListener('scroll', syncKeyboardInset);
    syncKeyboardInset();

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      vv?.removeEventListener('resize', syncKeyboardInset);
      vv?.removeEventListener('scroll', syncKeyboardInset);
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
    };
  }, [open, onClose, closeOnEscape]);
}

export function scrollFieldIntoView(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node?.scrollIntoView) return;
  window.setTimeout(() => {
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 280);
}
