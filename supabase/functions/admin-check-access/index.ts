/**
 * admin-check-access — Cheap "am I still an admin?" probe used by the DevKit
 * UI to validate its DevKit session before surfacing sensitive UI.
 *
 * Trigger: called from the React DevKit shell on mount and on focus to gate
 *   admin-only routes; also used by Playwright auth specs as a session check.
 * Auth: ADMIN ONLY (`requireAdminAuth` — DevKit session token in the
 *   Authorization header). No body parsing, no DB writes.
 * Dispatch contract: any HTTP method other than OPTIONS returns
 *   `{allowed:true}` (200) on a valid admin token, the helper's 401/403
 *   envelope on a missing/invalid token, or `{allowed:false,reason:'error'}`
 *   (500) on an unexpected throw.
 */
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
Deno.serve(wrapHandler("admin-check-access", async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    try {
      await requireAdminAuth(req, corsHeaders);
    } catch (authErr) {
      if (authErr instanceof Response) return authErr;
      throw authErr;
    }

    return new Response(
      JSON.stringify({ allowed: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch {
    return new Response(
      JSON.stringify({ allowed: false, reason: 'error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}));
