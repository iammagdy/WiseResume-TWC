/**
 * Resolve the URL for an Express-proxied edge-function call.
 *
 * Dev (Vite + Express on :5000/:5001): returns a relative `/api/fn/<name>` path so
 * the request goes through the local Express proxy, which performs
 * Kinde-token verification, profile upserts, and forwards to Supabase.
 *
 * Production (static SPA on Hostinger): there is no Express server, so we
 * must call the Supabase edge function directly. The `token-exchange`
 * function has `verify_jwt = false` and accepts the Kinde Bearer token in
 * the Authorization header; every other edge function uses `verify_jwt = true`
 * and accepts the bridge-minted Supabase JWT we already attach.
 *
 * If `VITE_SUPABASE_URL` is missing in a non-dev build we fall back to the
 * relative path so failures surface clearly instead of silently routing
 * traffic somewhere unintended.
 */
import { SUPABASE_URL } from '@/lib/supabaseConstants';

export function apiFnUrl(fnName: string): string {
  if (import.meta.env.DEV) {
    return `/api/fn/${fnName}`;
  }
  const base = SUPABASE_URL?.replace(/\/+$/, '');
  if (!base) {
    return `/api/fn/${fnName}`;
  }
  return `${base}/functions/v1/${fnName}`;
}
