import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const SESSION_KEY = 'autohistory_visit_session';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

/** Records SPA navigations as SiteVisit rows (fire-and-forget). */
export default function VisitTracker() {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const lastKey = useRef('');

  useEffect(() => {
    const path = `${pathname}${search || ''}`.slice(0, 500);
    const key = `${path}|${user?.id || ''}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    void api.trackVisit({
      path,
      sessionId: getSessionId(),
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      userId: user?.id,
    });
  }, [pathname, search, user?.id]);

  return null;
}
