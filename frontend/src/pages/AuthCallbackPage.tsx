import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../i18n/LanguageContext';
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

async function resolveSession() {
  if (!supabase) return null;

  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(error.message);
    if (data.session) return data.session;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export default function AuthCallbackPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [message, setMessage] = useState(t('auth.confirmingEmail'));
  const [showLoginLink, setShowLoginLink] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setMessage(t('auth.authNotConfigured'));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const session = await resolveSession();
        if (cancelled) return;

        if (!session) {
          setMessage(t('auth.emailLinkExpired'));
          setShowLoginLink(true);
          return;
        }

        await ensureAppProfile(session);
        const { user } = await api.me();
        window.history.replaceState({}, document.title, '/auth/callback');
        navigate(homeForRole(user.role), { replace: true });
      } catch (err) {
        if (!cancelled) {
          setMessage(err instanceof Error ? err.message : t('auth.accountSetupFailed'));
          setShowLoginLink(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, t]);

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
        {showLoginLink && (
          <p style={{ marginTop: '1rem' }}>
            <Link to="/login">{t('auth.goToLogin')}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
