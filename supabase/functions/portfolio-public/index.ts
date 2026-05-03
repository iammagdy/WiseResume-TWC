import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { isMaliciousBot, isKnownCrawler, hasForeignReferer, botBlockedResponse } from '../_shared/botGuard.ts';
import { checkIpRateLimit } from '../_shared/rateLimiter.ts';
import { getServiceClient } from '../_shared/dbClient.ts';

import { wrapHandler } from '../_shared/fnLogger.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Consolidated router for the four anonymous-readable portfolio public
 * edge functions (Task #49). Frees 3 slots under the 100-function
 * Supabase limit while preserving byte-for-byte parity with the
 * pre-merge endpoints (request shape, response shape, status codes,
 * CORS headers, anonymous-access behavior).
 *
 * Dispatch is read in this priority order:
 *   1. `?action=` query parameter — preferred path. The web helper
 *      `apiFnUrl()` always appends this when rewriting legacy fn names,
 *      so every real caller (browser fetch, sendBeacon, GET crawlers,
 *      short-link redirects) carries the query.
 *   2. `body.action` JSON field — the literal task contract. Used as
 *      a fallback for any future caller that wants body-based dispatch
 *      without a query string.
 *
 * Critically, when (1) succeeds the router does **not** touch the
 * request body at all — it forwards the original Request unchanged so
 * each sub-handler's `await req.json()` runs on the untouched stream
 * and any malformed-JSON 400 envelopes (e.g. portfolio-interest's
 * `{ error: 'Invalid JSON' }`) come from the handler itself, byte-for-
 * byte identical to the pre-merge behavior. The body is only peeked
 * when no query action is present (and only on POST/PUT/PATCH); even
 * then the bytes are rebuilt into a fresh Request before delegating,
 * so handlers always see the exact original request shape.
 *
 * Actions:
 *   - meta               ← was portfolio-meta            (GET)
 *   - interest           ← was portfolio-interest        (POST)
 *   - track-view         ← was track-portfolio-view      (POST)
 *   - resolve-short-link ← was resolve-short-link        (GET)
 *
 * The `resolve-short-link` action keeps its original CORS shape
 * (`Access-Control-Allow-Origin: *`) — the function is invoked by
 * arbitrary `/l/<slug>` clicks and was deliberately wildcard-CORS in
 * the pre-merge version. The other three actions use the standard
 * shared `getCorsHeaders(origin)` allow-list.
 */

// ──────────────────────────────────────────────────────────────────────
// portfolio-meta
// ──────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function handleMeta(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username')?.toLowerCase();
    const ua = req.headers.get('user-agent');

    // Block malicious scraper tools (but always let legitimate crawlers through
    // so SEO and social previews continue to work correctly)
    if (isMaliciousBot(ua) && !isKnownCrawler(ua)) {
      return botBlockedResponse(corsHeaders);
    }

    // Per-IP rate limit (120/min) — exempt known crawlers so social previews
    // and SEO indexing aren't throttled.
    if (!isKnownCrawler(ua)) {
      const clientIp =
        (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        null;
      if (clientIp) {
        const ipLimit = await checkIpRateLimit(clientIp, 'portfolio-meta', 120, 60);
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
      }
    }

    if (!username) {
      return new Response(JSON.stringify({ error: 'username required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve app URL dynamically from request origin/referer
    const KNOWN_DOMAINS = [
      'https://resume.thewise.cloud',
      'https://thewise.cloud',
    ];
    const DEFAULT_URL = 'https://resume.thewise.cloud';
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';
    const APP_URL = KNOWN_DOMAINS.find((d) => origin.startsWith(d) || referer.startsWith(d)) || DEFAULT_URL;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const portfolioUrl = `${APP_URL}/p/${username}`;
    const ogImageUrl = `${SUPABASE_URL}/functions/v1/og-image?username=${encodeURIComponent(username)}`;

    // Real browser — redirect to SPA
    if (!isKnownCrawler(ua)) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: portfolioUrl,
        },
      });
    }

    // Crawler — fetch profile and return meta HTML
    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data } = await supabase.rpc('get_public_portfolio', { p_username: username });

    let title = `${username}'s Portfolio — WiseResume`;
    let description = `View ${username}'s professional portfolio on WiseResume`;

    if (data) {
      const raw = data as Record<string, unknown>;
      const profile = (raw.profile || {}) as Record<string, unknown>;
      const resume = (raw.resume || {}) as Record<string, unknown>;

      const name = (profile.fullName as string) || username;
      const role = (profile.jobTitle as string) || null;
      const location = (profile.location as string) || null;
      const bio = (profile.portfolioBio as string) || null;
      const skills = ((resume.skills as string[]) || []).slice(0, 3).join(', ');
      const metaTitle = (profile.metaTitle as string) || null;
      const metaDescription = (profile.metaDescription as string) || null;

      if (metaTitle) {
        title = metaTitle;
      } else if (role) {
        title = `${name} — ${role}`;
      } else {
        title = `${name}'s Portfolio`;
      }

      if (metaDescription) {
        description = metaDescription;
      } else if (bio) {
        description = bio.slice(0, 160);
      } else {
        const parts = [role, location, skills].filter(Boolean);
        description = parts.length > 0
          ? `${name} · ${parts.join(' · ')}`
          : `${name}'s professional portfolio on WiseResume`;
      }
    }

    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const safeUrl = escapeHtml(portfolioUrl);
    const safeOgImg = escapeHtml(ogImageUrl);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <!-- Open Graph -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:image" content="${safeOgImg}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:site_name" content="WiseResume" />
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeOgImg}" />
  <!-- Canonical -->
  <link rel="canonical" href="${safeUrl}" />
</head>
<body>
  <noscript><a href="${safeUrl}">View ${safeTitle}</a></noscript>
  <script>window.location.replace(${JSON.stringify(portfolioUrl)});</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('portfolio-meta error:', err);
    return new Response('Internal Server Error', {
      status: 500,
      headers: getCorsHeaders(req.headers.get('origin')),
    });
  }
}

// ──────────────────────────────────────────────────────────────────────
// portfolio-interest
// ──────────────────────────────────────────────────────────────────────

async function handleInterest(req: Request): Promise<Response> {
  const corsHeaders = {
    ...getCorsHeaders(req.headers.get('origin')),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
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

  // Layered IP rate limits — these run BEFORE any DB lookup so abusive
  // traffic is rejected cheaply.
  if (clientIp) {
    // 5 per minute per IP across all portfolios — generic burst guard.
    const minuteLimit = await checkIpRateLimit(clientIp, 'portfolio-interest:minute', 5, 60);
    if (!minuteLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(minuteLimit.retryAfterSeconds),
        },
      });
    }
    // 20 per day per IP across all portfolios — slow-drip cap.
    const dailyLimit = await checkIpRateLimit(clientIp, 'portfolio-interest:day', 20, 86400);
    if (!dailyLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(dailyLimit.retryAfterSeconds),
        },
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

    const { error: insertError } = await supabase
      .from('portfolio_interactions')
      .insert({
        token: safeToken,
        portfolio_username: username.toLowerCase(),
        interaction_type: 'interested',
        referrer_hostname: referrerHostname,
      });

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
}

// ──────────────────────────────────────────────────────────────────────
// track-portfolio-view
// ──────────────────────────────────────────────────────────────────────

function toArpa(ip: string): string | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  return `${parts[3]}.${parts[2]}.${parts[1]}.${parts[0]}.in-addr.arpa`;
}

function parseCompanyFromPtr(ptr: string): string | null {
  const SKIP_DOMAINS = /\b(amazonaws|azure|googleusercontent|cloudfront|akamai|fastly|cloudflare|linode|vultr|digitalocean|hetzner|ovh|comcast|verizon|att\.net|spectrum|xfinity|tmobile|t-mobile|comcast|sbcglobal|bellsouth|dsl|dialup|pool|dynamic|dhcp|broadband|cable|fiber|fios|residential|static\.isp|no-reverse|ptr\.not|rdns\.not)\b/i;
  if (!ptr || SKIP_DOMAINS.test(ptr)) return null;
  const labels = ptr.toLowerCase().replace(/\.$/, '').split('.');
  if (labels.length < 2) return null;
  const sld = labels[labels.length - 2];
  const tld = labels[labels.length - 1];
  if (/^\d+$/.test(sld)) return null;
  return sld.charAt(0).toUpperCase() + sld.slice(1) + '.' + tld;
}

const GENERIC_ISP_RE = /\b(telecom|mobile|wireless|broadband|cable|internet|isp|fiber|fios|comcast|verizon|at&t|spectrum|xfinity|tmobile|t-mobile|residential|networks|hosting|cloud|amazonaws|azure|google cloud|digitalocean|linode|vultr|hetzner|ovh)\b/i;

async function handleTrackView(req: Request): Promise<Response> {
  const corsHeaders = {
    ...getCorsHeaders(req.headers.get('origin')),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const usernameRaw = typeof body.username === 'string' ? body.username.toLowerCase() : '';
  if (clientIp && usernameRaw) {
    const ipLimit = await checkIpRateLimit(
      clientIp,
      `track-portfolio-view:${usernameRaw}`,
      60,
      60,
    );
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
  }

  try {
    const { username, ref, sectionsViewed, sectionsTiming, timeSpentSeconds, device, abVariant } = body as {
      username: string;
      ref?: string;
      sectionsViewed?: string[];
      sectionsTiming?: Record<string, number>;
      timeSpentSeconds?: number;
      device?: 'mobile' | 'desktop' | 'tablet';
      abVariant?: 'a' | 'b';
    };

    if (!username || typeof username !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing username' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: rpcError } = await supabaseClient.rpc('increment_portfolio_views', {
      p_username: username.toLowerCase(),
    });

    if (rpcError) {
      console.error('Error incrementing view count:', rpcError);
    }

    let country: string | null = null;
    let city: string | null = null;
    let companyName: string | null = null;

    try {
      const cfCountry = req.headers.get('cf-ipcountry');
      if (cfCountry && cfCountry !== 'XX') {
        country = cfCountry;
      }

      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : null;

      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        const arpa = toArpa(ip);
        if (arpa) {
          try {
            const ptrRes = await Promise.race([
              fetch(`https://dns.google/resolve?name=${arpa}&type=PTR`),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
            ]);
            if (ptrRes instanceof Response && ptrRes.ok) {
              const ptrData = await ptrRes.json();
              const answers: Array<{ data: string }> = ptrData?.Answer ?? [];
              for (const ans of answers) {
                const parsed = parseCompanyFromPtr(ans.data ?? '');
                if (parsed) {
                  companyName = parsed;
                  break;
                }
              }
            }
          } catch {
            // PTR lookup failed
          }
        }

        if (!companyName) {
          const geoRes = await Promise.race([
            fetch(`https://ipwho.is/${ip}?fields=success,country,city,connection`),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);

          if (geoRes instanceof Response && geoRes.ok) {
            const geo = await geoRes.json();
            if (geo.success === true) {
              if (!country) country = geo.country || null;
              city = geo.city || null;

              const orgRaw = geo.connection?.org;
              if (orgRaw && typeof orgRaw === 'string') {
                const cleaned = orgRaw.replace(/^AS\d+\s+/i, '').trim();
                if (cleaned && !GENERIC_ISP_RE.test(cleaned)) {
                  companyName = cleaned;
                }
              }
            }
          }
        } else {
          const geoRes = await Promise.race([
            fetch(`https://ipwho.is/${ip}?fields=success,country,city`),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);
          if (geoRes instanceof Response && geoRes.ok) {
            const geo = await geoRes.json();
            if (geo.success === true) {
              if (!country) country = geo.country || null;
              city = geo.city || null;
            }
          }
        }
      }
    } catch (geoErr) {
      console.warn('Geolocation failed (non-fatal):', geoErr);
    }

    const { data: profileRow } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .eq('portfolio_enabled', true)
      .single();

    const referrer = req.headers.get('referer') || null;

    const sanitisedTiming: Record<string, number> = {};
    if (sectionsTiming && typeof sectionsTiming === 'object') {
      for (const [k, v] of Object.entries(sectionsTiming)) {
        if (typeof k === 'string' && typeof v === 'number' && v > 0) {
          sanitisedTiming[k] = Math.round(v);
        }
      }
    }

    const { error: visitError } = await supabaseClient.rpc('record_portfolio_visit', {
      p_username: username.toLowerCase(),
      p_country: country,
      p_city: city,
      p_referrer: referrer,
      p_short_link_id: ref || null,
      p_sections_viewed: sectionsViewed ?? [],
      p_time_spent_seconds: timeSpentSeconds ?? null,
      p_device: device ?? null,
      p_company_name: companyName,
      p_ab_variant: (abVariant === 'a' || abVariant === 'b') ? abVariant : null,
      p_sections_timing: Object.keys(sanitisedTiming).length > 0 ? sanitisedTiming : null,
    });

    if (visitError) {
      console.error('Error recording visit via RPC:', visitError);
    }

    if (profileRow?.user_id) {
      try {
        const locationParts = [city, country].filter(Boolean);
        const locationStr = locationParts.length > 0 ? ` from ${locationParts.join(', ')}` : '';
        await supabaseClient.from('notifications').insert({
          user_id: profileRow.user_id,
          type: 'portfolio_view',
          title: '👀 Someone viewed your portfolio',
          message: `A visitor${locationStr} just checked out your portfolio.`,
          link: '/portfolio?tab=analytics',
        });
      } catch (notifErr) {
        console.warn('Notification creation failed (non-fatal):', notifErr);
      }
    }

    if (ref) {
      await supabaseClient.rpc('increment_short_link_clicks', {
        p_id: ref,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ──────────────────────────────────────────────────────────────────────
// resolve-short-link
// ──────────────────────────────────────────────────────────────────────

const SHORT_LINK_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const SLUG_MIN_LENGTH = 5;
const SLUG_MAX_LENGTH = 20;
const SLUG_RE = /^[A-Za-z0-9_-]+$/;

const NOT_FOUND_THRESHOLD = 10;
const NOT_FOUND_WINDOW_SECONDS = 600;
const NOT_FOUND_LOCKOUT_BASE_SECONDS = 60;
const NOT_FOUND_LOCKOUT_MAX_SECONDS = 3600;

async function count404s(ip: string): Promise<number> {
  try {
    const supabase = getServiceClient();
    const since = new Date(Date.now() - NOT_FOUND_WINDOW_SECONDS * 1000).toISOString();
    const { count } = await supabase
      .from('rpc_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('endpoint', 'resolve-short-link:404')
      .gte('created_at', since);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function record404(ip: string): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase
      .from('rpc_rate_limits')
      .insert({ ip_address: ip, endpoint: 'resolve-short-link:404' });
  } catch (err) {
    console.warn('record404 failed (non-fatal):', err);
  }
}

async function handleResolveShortLink(req: Request): Promise<Response> {
  const corsHeaders = SHORT_LINK_CORS;
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const clientIp =
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    null;

  if (clientIp) {
    const ipLimit = await checkIpRateLimit(clientIp, 'resolve-short-link', 60, 60);
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

    const recent404s = await count404s(clientIp);
    if (recent404s >= NOT_FOUND_THRESHOLD) {
      const overflow = recent404s - NOT_FOUND_THRESHOLD + 1;
      const backoff = Math.min(
        NOT_FOUND_LOCKOUT_BASE_SECONDS * Math.pow(2, overflow - 1),
        NOT_FOUND_LOCKOUT_MAX_SECONDS,
      );
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(backoff),
        },
      });
    }
  }

  try {
    const url = new URL(req.url);
    const linkId = url.searchParams.get('id');

    if (
      !linkId ||
      typeof linkId !== 'string' ||
      linkId.length < SLUG_MIN_LENGTH ||
      linkId.length > SLUG_MAX_LENGTH ||
      !SLUG_RE.test(linkId)
    ) {
      return new Response(JSON.stringify({ error: 'Missing or invalid id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseClient.rpc('resolve_short_link', {
      p_link_id: linkId,
    });

    if (error) {
      console.error('Error resolving short link:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data) {
      if (clientIp) {
        await record404(clientIp);
      }
      return new Response(JSON.stringify({ error: 'Link not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (data.target_url && !String(data.target_url).startsWith('/')) {
      data.target_url = null;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// ──────────────────────────────────────────────────────────────────────
// router
// ──────────────────────────────────────────────────────────────────────

/**
 * Peek at the JSON body for `action` without breaking the request
 * stream contract. Returns `{ action, req }` where `req` is a fresh
 * Request carrying the same body bytes (so each sub-handler can call
 * `await req.json()` exactly as before). When the body is absent,
 * empty, or not JSON, returns a null action and a request the
 * sub-handler can still consume — preserving the handler's native
 * malformed-JSON 400 envelope.
 *
 * Only call this AFTER checking `?action=` query — see router below.
 */
async function peekActionFromBody(req: Request): Promise<{ action: string | null; req: Request }> {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return { action: null, req };
  }
  let bodyText = '';
  try {
    bodyText = await req.text();
  } catch {
    return { action: null, req };
  }
  let parsed: unknown = null;
  if (bodyText.length > 0) {
    try { parsed = JSON.parse(bodyText); } catch { /* ignore — handler will surface its own 'Invalid JSON' */ }
  }
  const action = (parsed && typeof parsed === 'object' && 'action' in parsed
    && typeof (parsed as { action?: unknown }).action === 'string')
    ? ((parsed as { action: string }).action)
    : null;
  const rebuilt = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: bodyText.length > 0 ? bodyText : null,
  });
  return { action, req: rebuilt };
}

Deno.serve(wrapHandler('portfolio-public', async (incoming: Request) => {
  // PRIORITY 1: ?action= query parameter. The web helper always sets
  // this for rewritten calls, so every real caller hits this branch
  // and the body is forwarded UNTOUCHED to the sub-handler. This
  // preserves byte-for-byte parity for malformed-JSON paths
  // (e.g. portfolio-interest's `{ error: 'Invalid JSON' }`) — the
  // handler runs `await req.json()` on the original stream and
  // surfaces its own 400 envelope identically to the pre-merge
  // function.
  const queryAction = new URL(incoming.url).searchParams.get('action');
  let action: string | null = queryAction;
  let req: Request = incoming;

  // PRIORITY 2: body.action fallback (literal task contract). Only
  // peeked when no query action exists — and even then the body is
  // rebuilt from the same bytes before delegating.
  if (!action) {
    const peeked = await peekActionFromBody(incoming);
    action = peeked.action;
    req = peeked.req;
  }

  switch (action) {
    case 'meta':
      return await handleMeta(req);
    case 'interest':
      return await handleInterest(req);
    case 'track-view':
      return await handleTrackView(req);
    case 'resolve-short-link':
      return await handleResolveShortLink(req);
    default: {
      const corsHeaders = getCorsHeaders(req.headers.get('origin'));
      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      return new Response(
        JSON.stringify({ error: `Unknown or missing action: ${action ?? '(none)'}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  }
}));
