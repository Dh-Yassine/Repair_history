import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let adminClient = null;

// Node.js < 22 has no native WebSocket global. Pass the `ws` package as the
// Realtime transport so the admin client doesn't throw on construction.
const realtimeTransport = typeof WebSocket === 'undefined' ? ws : WebSocket;

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;
  if (!adminClient) {
    adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: realtimeTransport },
    });
  }
  return adminClient;
}

export async function verifySupabaseToken(token) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
