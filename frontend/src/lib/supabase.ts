import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseAuthEnabled() {
  return Boolean(url && anonKey);
}

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!isSupabaseAuthEnabled()) {
    throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  if (!client) client = createClient(url!, anonKey!);
  return client;
}

/** Safe client for optional Supabase usage */
export const supabase = isSupabaseAuthEnabled() ? createClient(url!, anonKey!) : null;
