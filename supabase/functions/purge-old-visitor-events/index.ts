/**
 * purge-old-visitor-events — cron-triggered retention sweep.
 * Deletes visitor_events rows older than 365 days.
 * Schedule: daily at 03:00 UTC.
 *
 * Auth: CRON_SECRET header required.
 */
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

Deno.serve(wrapHandler('purge-old-visitor-events', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Cron secret auth
  const cronSecret = Deno.env.get('CRON_SECRET');
  const incoming   = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (!cronSecret || incoming !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('purge_old_visitor_events');

  if (error) {
    console.error('[purge-old-visitor-events] error:', error);
    return new Response(JSON.stringify({ error: String(error.message) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, deleted: data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));
