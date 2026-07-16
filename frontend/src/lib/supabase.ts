import { createClient, type AuthError, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseAuthEnabled() {
  return Boolean(url && anonKey);
}

function authOptions() {
  return {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      // Implicit works for email recovery links opened from mail apps / other devices.
      // PKCE stores a code verifier in localStorage and fails when the link is opened elsewhere
      // (or when the callback also exchanges the code a second time).
      flowType: 'implicit' as const,
    },
  } as const;
}

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!isSupabaseAuthEnabled()) {
    throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  if (!client) client = createClient(url!, anonKey!, authOptions());
  return client;
}

/** Safe client for optional Supabase usage */
export const supabase = isSupabaseAuthEnabled() ? createClient(url!, anonKey!, authOptions()) : null;

export function authCallbackUrl() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/auth/callback`;
}

/** Read hash / query auth params before Supabase clears them. */
export function getAuthRedirectHints() {
  if (typeof window === 'undefined') {
    return { isRecovery: false, errorDescription: null as string | null };
  }
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const type = hash.get('type') || query.get('type');
  const errorDescription =
    hash.get('error_description') ||
    query.get('error_description') ||
    hash.get('error') ||
    query.get('error');
  return {
    isRecovery: type === 'recovery',
    errorDescription: errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : null,
  };
}

/** Turn Supabase auth errors into user-friendly messages */
export function formatAuthError(error: AuthError): string {
  const msg = error.message?.toLowerCase() ?? '';

  if (error.status === 422) {
    if (msg.includes('redirect') || msg.includes('url')) {
      return 'Sign-up redirect URL is not allowed. In Supabase → Authentication → URL configuration, add: https://repair-history.netlify.app/auth/callback';
    }
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return 'This email is already registered. Use the login page instead.';
    }
    if (msg.includes('password')) {
      return 'Password must be at least 6 characters.';
    }
    return error.message || 'Sign-up could not be completed. Try logging in if you already have an account.';
  }

  if (error.status === 429) {
    return 'Too many attempts. Wait an hour or disable email confirmation in Supabase while testing.';
  }

  return error.message || 'Authentication failed';
}
