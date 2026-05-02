/**
 * Resend health check helper for admin-devkit-data mission control.
 *
 * Extracted into its own module so it can be unit-tested under Vitest
 * (the Edge runtime imports it the same way as any other helper).
 *
 * Pure web APIs only (fetch, AbortSignal.timeout, JSON.parse) — no Deno-
 * specific globals — so it runs unchanged in Node, Deno, and jsdom.
 *
 * The `restricted_key` branch matters because Resend signs send-only API
 * keys with `name === 'restricted_api_key'` on a 401. Mission Control uses
 * that structured reason to render a friendly explanation instead of the
 * vague "401 Unauthorized" the user would otherwise see.
 */

export type ResendCheckResult =
  | { reachable: false; httpStatus: 0; sends24h: null; reason: 'missing_key' }
  | { reachable: false; httpStatus: 401; sends24h: null; reason: 'restricted_key' }
  | { reachable: false; httpStatus: number; sends24h: null }
  | { reachable: true; httpStatus: number; sends24h: number };

export async function checkResend(apiKey: string): Promise<ResendCheckResult> {
  if (!apiKey) {
    return { reachable: false, httpStatus: 0, sends24h: null, reason: 'missing_key' };
  }
  try {
    const resp = await fetch('https://api.resend.com/emails?limit=100', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      // Detect a restricted (send-only) Resend API key — Mission Control
      // can then render a friendly explanation instead of a vague 401.
      if (resp.status === 401) {
        try {
          const txt = await resp.text();
          const parsed = JSON.parse(txt) as { name?: string };
          if (parsed.name === 'restricted_api_key') {
            return { reachable: false, httpStatus: 401, sends24h: null, reason: 'restricted_key' };
          }
        } catch { /* not JSON — fall through */ }
      }
      return { reachable: false, httpStatus: resp.status, sends24h: null };
    }
    const body = await resp.json() as { data?: Array<{ created_at: string }> };
    const cutoff = Date.now() - 86400_000;
    const sends24h = (body.data ?? []).filter(
      (e) => new Date(e.created_at).getTime() > cutoff,
    ).length;
    return { reachable: true, httpStatus: resp.status, sends24h };
  } catch {
    return { reachable: false, httpStatus: 0, sends24h: null };
  }
}
