/**
 * manage-api-keys — retired (BYOK removed).
 *
 * This endpoint handled BYOK (Bring Your Own Key) API key management.
 * BYOK was removed in the flat-pool migration. The managed pool is the
 * only AI engine. This tombstone returns 410 Gone for all requests.
 */
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({ error: 'gone', message: 'BYOK key management has been removed. AI is now powered by the managed provider pool.' }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
