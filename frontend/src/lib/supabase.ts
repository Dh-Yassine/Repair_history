import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
