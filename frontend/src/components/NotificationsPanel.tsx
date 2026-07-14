import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { api } from '../api';
import { useOverlayPanel } from '../hooks/useOverlayPanel';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { Notification } from '../types';

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 900px)');

  useOverlayPanel(open, () => setOpen(false));

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
        aria-label="Notifications"
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
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            />
          )}
          <div className={`notifications-panel ${isMobile ? 'notifications-sheet' : ''}`}>
            <div className="notifications-panel-head">
              <strong>Notifications</strong>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="notifications-panel-body">
              {notifications.length === 0 ? (
                <div style={{ padding: '8px 0' }}>
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    Nothing yet. You&apos;ll be notified here when a shop verifies a record or a
                    service reminder comes due.
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
                    <p>{n.message}</p>
                    <span className="mono subtle">{new Date(n.createdAt).toLocaleString()}</span>
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
