import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';

// Node.js < 22 has no native WebSocket — load the ws package so the Supabase
// Realtime client doesn't throw when the admin client is constructed.
const _require = createRequire(import.meta.url);
let _ws = null;
try {
  _ws = _require('ws');
} catch {
  // ws not available; only an issue on Node.js < 22 without native WebSocket
}

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let adminClient = null;

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null;
  if (!adminClient) {
    const realtimeOpts = _ws && typeof WebSocket === 'undefined' ? { transport: _ws } : {};
    adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: realtimeOpts,
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
