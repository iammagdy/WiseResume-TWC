import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KNOWN_CRAWLERS = [
  'linkedinbot',
  'twitterbot',
  'facebookexternalhit',
  'slackbot',
  'whatsapp',
  'discordbot',
  'telegrambot',
  'googlebot',
  'bingbot',
  'ia_archiver',
  'applebot',
];

function isCrawler(ua: string | null): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return KNOWN_CRAWLERS.some((c) => lower.includes(c));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username')?.toLowerCase();
    const ua = req.headers.get('user-agent');

    if (!username) {
      return new Response(JSON.stringify({ error: 'username required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const APP_URL = 'https://wiseresume.lovable.app';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const portfolioUrl = `${APP_URL}/p/${username}`;
    const ogImageUrl = `${SUPABASE_URL}/functions/v1/og-image?username=${encodeURIComponent(username)}`;

    // Real browser — redirect to SPA
    if (!isCrawler(ua)) {
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
      headers: corsHeaders,
    });
  }
});
