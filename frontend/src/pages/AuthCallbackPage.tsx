import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';
import { getAuthRedirectHints, supabase } from '../lib/supabase';
import { useLanguage } from '../i18n/LanguageContext';
import type { UserRole } from '../types';

function homeForRole(role?: UserRole) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'SHOP') return '/shop';
  if (role === 'BUYER') return '/buyer';
  return '/';
}

async function ensureAppProfile(
  session: NonNullable<
    Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']
  >
) {
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

/**
 * Wait for detectSessionInUrl to finish — do NOT call exchangeCodeForSession here.
 * A second exchange clears/consumes the PKCE verifier and causes the "code verifier not found" error.
 */
function waitForAuthSession(timeoutMs = 8000): Promise<{
  session: NonNullable<
    Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']
  > | null;
  isRecovery: boolean;
}> {
  return new Promise((resolve) => {
    const client = supabase;
    if (!client) {
      resolve({ session: null, isRecovery: false });
      return;
    }

    const hasAuthParams =
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token') ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery');
    const waitMs = hasAuthParams ? timeoutMs : 1200;

    let settled = false;
    let isRecovery = false;

    const finish = (
      session: NonNullable<
        Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']
      > | null
    ) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
      resolve({ session, isRecovery });
    };

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') isRecovery = true;
      if (
        session &&
        (event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'PASSWORD_RECOVERY' ||
          event === 'TOKEN_REFRESHED')
      ) {
        finish(session);
      }
    });
    const subscription = data.subscription;

    const timer = setTimeout(async () => {
      const { data: current } = await client.auth.getSession();
      finish(current.session);
    }, waitMs);

    void client.auth.getSession().then(({ data: current }) => {
      if (current.session) finish(current.session);
    });
  });
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
    // Capture before Supabase strips the hash
    const hints = getAuthRedirectHints();

    (async () => {
      try {
        if (hints.errorDescription) {
          if (!cancelled) {
            setMessage(hints.errorDescription);
            setShowLoginLink(true);
          }
          return;
        }

        const { session, isRecovery: recoveryEvent } = await waitForAuthSession();
        if (cancelled) return;

        if (!session) {
          setMessage(t('auth.emailLinkExpired'));
          setShowLoginLink(true);
          return;
        }

        await ensureAppProfile(session);
        const { user } = await api.me();
        window.history.replaceState({}, document.title, '/auth/callback');

        if (hints.isRecovery || recoveryEvent) {
          navigate('/settings?reset=1', { replace: true });
          return;
        }

        navigate(homeForRole(user.role), { replace: true });
      } catch (err) {
        if (!cancelled) {
          const raw = err instanceof Error ? err.message : '';
          const isPkce =
            raw.toLowerCase().includes('pkce') || raw.toLowerCase().includes('code verifier');
          setMessage(isPkce ? t('auth.pkceRecoveryFailed') : raw || t('auth.accountSetupFailed'));
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
