/**
 * Bot guard utilities for public edge functions.
 *
 * Provides two layers of protection:
 *   1. User-Agent fingerprinting — blocks known scraper libraries and
 *      headless tools while letting legitimate search/social crawlers through.
 *   2. Referer validation — ensures a request actually originated from our
 *      app's domain (used on analytics endpoints that should never be called
 *      by external tools).
 *
 * Neither check is unbypassable on its own; they work alongside the IP-based
 * rate limiter in rateLimiter.ts to create multiple overlapping layers.
 */

/** User-agent substrings that indicate known scraper / automation tools. */
const MALICIOUS_UA_PATTERNS: string[] = [
  'python-requests',
  'python-urllib',
  'python-httpx',
  'scrapy',
  'curl/',
  'wget/',
  'libwww-perl',
  'go-http-client',
  'java/',
  'okhttp',
  'apache-httpclient',
  'ruby',
  'perl/',
  'php/',
  'httpclient',
  'httpie',
  'node-fetch',
  'got/',
  'undici',
  'axios/',
  'playwright',
  'puppeteer',
  'selenium',
  'phantomjs',
  'slimerjs',
  'htmlunit',
  'mechanize',
  'lwp::simple',
  'zgrab',
  'masscan',
  'nmap',
  'nikto',
  'sqlmap',
  'dirbuster',
  'burpsuite',
  'havij',
  'openvas',
  'nuclei',
  'aiohttp/',
  'httpx/',
];

/**
 * Legitimate search engine and social media crawlers.
 * Requests from these should be allowed even on restricted endpoints.
 */
const KNOWN_CRAWLERS: string[] = [
  'googlebot',
  'google-inspectiontool',
  'bingbot',
  'bingpreview',
  'twitterbot',
  'facebookexternalhit',
  'facebot',
  'linkedinbot',
  'slackbot',
  'whatsapp',
  'discordbot',
  'telegrambot',
  'applebot',
  'ia_archiver',
  'archive.org',
  'yandexbot',
  'duckduckbot',
];

/**
 * Returns true if the User-Agent string matches a known scraper / automation
 * tool that should not be accessing this endpoint.
 *
 * @param ua            Value of the User-Agent request header (may be null).
 * @param opts.strict   If true, a missing UA is also treated as malicious.
 *                      Default false (missing UA is allowed — some privacy
 *                      browsers and internal health checks omit it).
 */
export function isMaliciousBot(ua: string | null, opts?: { strict?: boolean }): boolean {
  if (!ua) return opts?.strict === true;
  const lower = ua.toLowerCase();
  return MALICIOUS_UA_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Returns true if the User-Agent belongs to a legitimate search engine
 * or social-media link-preview crawler.
 */
export function isKnownCrawler(ua: string | null): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return KNOWN_CRAWLERS.some((c) => lower.includes(c));
}

/**
 * Returns true if the Referer header is present AND comes from a domain
 * that is NOT in the allowed list.
 *
 * Returns false (i.e. not suspicious) when:
 *   - Referer is absent — privacy browsers and direct navigations omit it.
 *   - Referer belongs to an allowed domain.
 *
 * @param referer        Value of the Referer / referer request header.
 * @param allowedHosts   Exact hostnames that are permitted, e.g.
 *                       ['resume.thewise.cloud', 'localhost'].
 */
export function hasForeignReferer(referer: string | null, allowedHosts: string[]): boolean {
  if (!referer) return false; // absent referer is not suspicious
  try {
    const { hostname } = new URL(referer);
    return !allowedHosts.some(
      (h) => hostname === h || hostname.endsWith('.' + h),
    );
  } catch {
    // Malformed Referer header — treat as suspicious
    return true;
  }
}

/**
 * Convenience: build a standard 403 response for blocked bots.
 */
export function botBlockedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
