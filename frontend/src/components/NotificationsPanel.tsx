import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { formatDateTime } from '../lib/format';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useOverlayPanel } from '../hooks/useOverlayPanel';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useLanguage } from '../i18n/LanguageContext';
import type { Notification } from '../types';

export default function NotificationsPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 900px)');

  useOverlayPanel(open, () => setOpen(false));

  /** A handful of notification types are known enough to fully translate; anything else falls back to the stored (English) message. */
  function localize(n: Notification) {
    if (n.type === 'shop_approved') return t('notifications.typeShopApproved');
    return n.message;
  }

  async function load() {
    try {
      const data = await api.notifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.('.notifications-trigger')) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  async function markRead(id: string) {
    await api.markNotificationRead(id);
    await load();
  }

  return (
    <div className="notifications-wrap" ref={panelRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm notifications-trigger topbar-icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('notifications.title')}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="notifications-badge" aria-hidden />}
      </button>

      {open && (
        <>
          {isMobile && (
            <button
              type="button"
              className="notifications-backdrop"
              aria-label={t('notifications.close')}
              onClick={() => setOpen(false)}
            />
          )}
          <div className={`notifications-panel ${isMobile ? 'notifications-sheet' : ''}`}>
            <div className="notifications-panel-head">
              <strong>{t('notifications.title')}</strong>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
              >
                <X size={16} />
              </button>
            </div>
            <div className="notifications-panel-body">
              {notifications.length === 0 ? (
                <div style={{ padding: '8px 0' }}>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    {user?.role === 'SHOP' ? t('notifications.emptyShop') : t('notifications.empty')}
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`notifications-item ${n.read ? 'read' : ''}`}
                    onClick={() => !n.read && markRead(n.id)}
                    disabled={n.read}
                  >
                    <p>{localize(n)}</p>
                    <span className="mono subtle">{formatDateTime(n.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
