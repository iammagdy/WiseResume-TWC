// admin-check-access: Verifies that the caller holds a valid DevKit admin
// session token (Authorization: Bearer <token>). Returns { allowed: true }
// on success and a 401/403 response on failure. The admin panel calls this to
// validate its DevKit session before surfacing sensitive UI.
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
