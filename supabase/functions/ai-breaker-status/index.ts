/**
 * Read-only debug endpoint exposing the current state of the Postgres-backed
 * AI provider circuit breaker (Phase 4). Admin-gated via DevKit session token
 * — same auth flow used by every other admin-* function.
 *
 * Response shape:
 *   {
 *     now:      ISO timestamp,
 *     providers: [
 *       {
 *         provider:          'wiseresume/openrouter',
 *         failure_count:     3,
 *         window_started_at: ISO timestamp,
 *         opened_until:      ISO timestamp | null,
 *         last_success_at:   ISO timestamp | null,
 *         last_failure_at:   ISO timestamp | null,
 *         is_open:           boolean,
 *         updated_at:        ISO timestamp
 *       },
 *       ...
 *     ]
 *   }
 *
 * Caller passes the DevKit session token in the `Authorization: Bearer`
 * header (AUTH-5 / audit M6 — body transport removed).
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAdminAuth } from '../_shared/adminAuth.ts';
import { getServiceClient } from '../_shared/dbClient.ts';

interface BreakerRow {
  provider: string;
  failure_count: number;
  window_started_at: string;
  opened_until: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  updated_at: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // DevKit session token comes via Authorization: Bearer <token>.
    try {
      await requireAdminAuth(req, corsHeaders);
    } catch (resp) {
      if (resp instanceof Response) return resp;
      throw resp;
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('ai_provider_breaker')
      .select('provider, failure_count, window_started_at, opened_until, last_success_at, last_failure_at, updated_at')
      .order('provider', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: 'breaker_read_failed', message: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const now = Date.now();
    const providers = ((data || []) as BreakerRow[]).map((row) => ({
      ...row,
      is_open: row.opened_until !== null && new Date(row.opened_until).getTime() > now,
    }));

    return new Response(
      JSON.stringify({
        now: new Date(now).toISOString(),
        providers,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[ai-breaker-status] unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'internal', message: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
