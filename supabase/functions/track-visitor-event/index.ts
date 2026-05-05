/**
 * track-visitor-event — receives batched visitor events from the browser,
 * enriches them with server-side geo data from Cloudflare / forwarded headers,
 * and bulk-inserts into visitor_events.
 *
 * Auth: none (verify_jwt = false, anon insert RLS policy on the table).
 * Rate limit: 120 req/min per IP via checkIpRateLimit.
 */
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/dbClient.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';
import { checkIpRateLimit } from '../_shared/rateLimiter.ts';

interface ClientEvent {
  anon_id: string;
  user_id?: string | null;
  session_id: string;
  event_type: 'page_view' | 'click' | 'section_view' | 'feature_use';
  page?: string;
  target?: string;
  section?: string;
  referrer?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  browser?: string;
  os?: string;
}

// UUID v4 validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_EVENT_TYPES = new Set(['page_view', 'click', 'section_view', 'feature_use']);
const VALID_DEVICES = new Set(['mobile', 'desktop', 'tablet', null, undefined]);

function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

Deno.serve(wrapHandler('track-visitor-event', async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // IP-based rate limit
  const clientIp =
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const ipLimit = await checkIpRateLimit(clientIp, 'track-visitor-event', 120, 60);
  if (!ipLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(ipLimit.retryAfterSeconds),
      },
    });
  }

  // Geo resolution from Cloudflare headers (injected by the Supabase edge network)
  const country = req.headers.get('CF-IPCountry') || req.headers.get('cf-ipcountry') || null;
  const city    = req.headers.get('CF-IPCity')    || req.headers.get('cf-ipcity')    || null;

  let body: { events?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate and sanitize each event
  const rows: Record<string, unknown>[] = [];
  for (const raw of body.events.slice(0, 100)) {
    const ev = raw as Partial<ClientEvent>;
    if (!isValidUuid(ev.anon_id)) continue;
    if (!isValidUuid(ev.session_id)) continue;
    if (!ev.event_type || !VALID_EVENT_TYPES.has(ev.event_type)) continue;
    if (!VALID_DEVICES.has(ev.device_type ?? null)) continue;

    rows.push({
      anon_id:     ev.anon_id,
      user_id:     isValidUuid(ev.user_id) ? ev.user_id : null,
      session_id:  ev.session_id,
      event_type:  ev.event_type,
      page:        typeof ev.page === 'string'    ? ev.page.slice(0, 512)    : null,
      target:      typeof ev.target === 'string'  ? ev.target.slice(0, 256)  : null,
      section:     typeof ev.section === 'string' ? ev.section.slice(0, 128) : null,
      referrer:    typeof ev.referrer === 'string'? ev.referrer.slice(0, 512): null,
      device_type: ev.device_type ?? null,
      browser:     typeof ev.browser === 'string' ? ev.browser.slice(0, 64)  : null,
      os:          typeof ev.os === 'string'       ? ev.os.slice(0, 64)       : null,
      country,
      city,
    });
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = getServiceClient();
  const { error } = await supabase.from('visitor_events').insert(rows);

  if (error) {
    console.error('[track-visitor-event] insert error:', error);
    return new Response(JSON.stringify({ error: 'DB insert failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}));
