import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

function homeForRole(role?: UserRole) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'SHOP') return '/shop';
  if (role === 'BUYER') return '/buyer';
  return '/';
}

async function ensureAppProfile(session: NonNullable<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>) {
  const token = session.access_token;
  setToken(token);

  const meta = session.user.user_metadata ?? {};
  const role = (meta.role as UserRole | undefined) ?? 'OWNER';

  try {
    await api.me();
    return;
  } catch {
    await api.syncProfile(
      {
        fullName: meta.full_name || meta.fullName || session.user.email?.split('@')[0] || 'User',
        role: role === 'SHOP' ? 'SHOP' : role === 'BUYER' ? 'BUYER' : 'OWNER',
        phone: meta.phone || undefined,
        shopName: meta.shop_name || meta.shopName || undefined,
        address: meta.address || undefined,
      },
      token
    );
  }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Confirming your email…');

  useEffect(() => {
    if (!supabase) {
      setMessage('Auth is not configured.');
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error || !data.session) {
        setMessage('Could not verify your email. Try signing in from the login page.');
        return;
      }

      try {
        await ensureAppProfile(data.session);
        const { user } = await api.me();
        window.history.replaceState({}, document.title, '/auth/callback');
        navigate(homeForRole(user.role), { replace: true });
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Account setup failed. Try signing in.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'var(--color-bg)',
      }}
    >
      <div className="card" style={{ maxWidth: 420, textAlign: 'center', padding: '2rem' }}>
        <p className="mono muted">{message}</p>
      </div>
    </div>
  );
}
