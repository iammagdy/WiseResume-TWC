import { requireAuth, AuthError } from '../_shared/authMiddleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { wrapHandler } from '../_shared/fnLogger.ts';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;

function jsonError(cors: Record<string, string>, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function isPrivateHostname(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) return true;
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (
    hostname.startsWith('fc') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fe80') ||
    hostname === '::1'
  ) return true;
  return false;
}

Deno.serve(wrapHandler('fetch-url', async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonError(corsHeaders, 'Method not allowed', 405);

  try {
    await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) return jsonError(corsHeaders, err.message, err.status);
    return jsonError(corsHeaders, 'Unauthorized', 401);
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return jsonError(corsHeaders, 'Invalid JSON body', 400);
  }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return jsonError(corsHeaders, 'Missing `url` in request body', 400);
  }
  if (url.length > 2000) {
    return jsonError(corsHeaders, 'URL is too long (max 2000 characters)', 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return jsonError(corsHeaders, 'Invalid URL', 400);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return jsonError(corsHeaders, 'Only http and https URLs are allowed', 400);
  }

  if (isPrivateHostname(parsed.hostname)) {
    return jsonError(corsHeaders, 'Target host is not publicly reachable', 400);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let currentUrl = parsed.toString();
    let upstream: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const hopUrl = new URL(currentUrl);
      if (hopUrl.protocol !== 'http:' && hopUrl.protocol !== 'https:') {
        return jsonError(corsHeaders, 'Redirect to unsupported scheme blocked', 400);
      }
      if (isPrivateHostname(hopUrl.hostname)) {
        return jsonError(corsHeaders, 'Target host is not publicly reachable', 400);
      }

      const r = await fetch(hopUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WiseResume-Importer/1.0 (+https://resume.thewise.cloud)',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
        },
      });

      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get('location');
        if (!location) { upstream = r; break; }
        if (hop === MAX_REDIRECTS) {
          return jsonError(corsHeaders, 'Too many redirects', 502);
        }
        currentUrl = new URL(location, hopUrl).toString();
        continue;
      }
      upstream = r;
      break;
    }

    clearTimeout(timeoutId);

    if (!upstream) return jsonError(corsHeaders, 'Failed to fetch URL', 502);

    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok) {
      return jsonError(corsHeaders, `Upstream responded with ${upstream.status}`, 502);
    }
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return jsonError(corsHeaders, `Unsupported content-type: ${contentType || 'unknown'}`, 415);
    }

    const contentLength = upstream.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_BYTES) {
      return jsonError(corsHeaders, 'Response too large', 413);
    }

    const rawBytes = await upstream.arrayBuffer();
    if (rawBytes.byteLength > MAX_BYTES) {
      return jsonError(corsHeaders, 'Response too large', 413);
    }
    const html = new TextDecoder().decode(rawBytes);

    return new Response(
      JSON.stringify({ url: parsed.toString(), contentType, html: html.slice(0, MAX_BYTES) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error)?.name === 'AbortError') {
      return jsonError(corsHeaders, 'Request timed out', 504);
    }
    return jsonError(corsHeaders, 'Failed to fetch URL', 502);
  }
}));
