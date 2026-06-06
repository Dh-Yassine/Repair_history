import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api';
import type { Notification } from '../types';

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  async function markRead(id: string) {
    await api.markNotificationRead(id);
    await load();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-danger)',
            }}
          />
        )}
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 8,
            width: 320,
            maxHeight: 360,
            overflow: 'auto',
            zIndex: 100,
            padding: 12,
          }}
        >
          <strong style={{ fontSize: 13 }}>Notifications</strong>
          {notifications.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
              No notifications
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-border)',
                  opacity: n.read ? 0.6 : 1,
                  cursor: n.read ? 'default' : 'pointer',
                }}
                onClick={() => !n.read && markRead(n.id)}
              >
                <p style={{ margin: 0, fontSize: 13 }}>{n.message}</p>
                <p className="mono subtle" style={{ fontSize: 11, marginTop: 4 }}>
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
