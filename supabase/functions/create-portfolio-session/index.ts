import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/dbClient.ts";
import { logger } from "../_shared/logger.ts";
import { createSessionToken } from "../_shared/portfolioSession.ts";

const log = logger('create-portfolio-session');

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    let portfolioUsername: string | undefined;
    try {
      const body = await req.json();
      portfolioUsername = typeof body.portfolioUsername === 'string'
        ? body.portfolioUsername.toLowerCase().trim()
        : undefined;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!portfolioUsername) {
      return new Response(
        JSON.stringify({ error: 'portfolioUsername is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the portfolio exists server-side — callers cannot forge this step
    const supabase = getServiceClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', portfolioUsername)
      .maybeSingle();

    if (profileError) {
      log.error('Profile lookup failed', profileError, { portfolioUsername });
      return new Response(
        JSON.stringify({ error: 'Service unavailable. Please try again.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile?.user_id) {
      return new Response(
        JSON.stringify({ error: 'Portfolio not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Issue a signed session token (1 hour TTL, HMAC-SHA256 signed server-side)
    const { token, expiresAt, sessionId } = await createSessionToken(portfolioUsername);

    log.info('Portfolio visitor session issued', { portfolioUsername, sessionId });

    return new Response(
      JSON.stringify({ token, expiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    log.error('Unhandled error', err);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
