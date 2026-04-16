import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkIpRateLimit } from '../_shared/rateLimiter.ts';
import { isMaliciousBot, hasForeignReferer, botBlockedResponse } from '../_shared/botGuard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const ua = req.headers.get('user-agent');
  if (isMaliciousBot(ua)) {
    return botBlockedResponse(corsHeaders);
  }

  const referer = req.headers.get('referer');
  if (hasForeignReferer(referer, ['thewise.cloud', 'localhost'])) {
    return botBlockedResponse(corsHeaders);
  }

  const clientIp =
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    null;

  let body: { username?: string; token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { username, token } = body;
  if (!username || typeof username !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing username' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate token — must be a UUID v4 pattern (client-generated)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const safeToken = typeof token === 'string' && UUID_RE.test(token)
    ? token
    : crypto.randomUUID();

  // IP rate limit: 1 interest per IP per portfolio per hour (secondary guard)
  if (clientIp) {
    const key = `portfolio-interest:${username.toLowerCase()}`;
    const ipLimit = await checkIpRateLimit(clientIp, key, 1, 3600);
    if (!ipLimit.allowed) {
      return new Response(JSON.stringify({ ok: true, alreadySent: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .eq('portfolio_enabled', true)
      .single();

    if (!profileRow?.user_id) {
      return new Response(JSON.stringify({ error: 'Portfolio not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract referrer hostname for display
    let referrerHostname: string | null = null;
    let referrerText = '';
    if (referer) {
      try {
        const refUrl = new URL(referer);
        referrerHostname = refUrl.hostname;
        referrerText = ` via ${referrerHostname}`;
      } catch {
        // ignore malformed referer
      }
    }

    // Persist a tokenized interaction record — ON CONFLICT (token) means duplicate
    // submissions from the same client are silently deduplicated at the DB level.
    const { error: insertError } = await supabase
      .from('portfolio_interactions')
      .insert({
        token: safeToken,
        portfolio_username: username.toLowerCase(),
        interaction_type: 'interested',
        referrer_hostname: referrerHostname,
      });

    // If we hit the unique constraint on `token`, this interest was already recorded.
    const isDuplicate = insertError?.code === '23505';
    if (insertError && !isDuplicate) {
      console.error('portfolio_interactions insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (isDuplicate) {
      return new Response(JSON.stringify({ ok: true, alreadySent: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fresh interaction — notify the portfolio owner
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });

    await supabase.from('notifications').insert({
      user_id: profileRow.user_id,
      type: 'recruiter_interest',
      title: '🌟 Someone is interested in your profile!',
      message: `A recruiter or visitor expressed interest in your portfolio${referrerText} on ${timeStr}.`,
      link: '/portfolio?tab=visitors',
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('portfolio-interest error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
