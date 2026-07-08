import type { VercelRequest, VercelResponse } from '@vercel/node';
import { lookup } from 'node:dns/promises';
const MAX_PUBLIC_FETCH_REDIRECTS = 5;
const MAX_PUBLIC_FETCH_BYTES = 2 * 1024 * 1024;

function isPrivateOrLocalIpAddress(address: string): boolean {
  const h = address.toLowerCase().replace(/^\[|\]$/g, '');

  if (h === '::' || h === '::1') return true;
  if (/^(fc|fd)[0-9a-f]{0,2}:/i.test(h)) return true;
  if (/^fe80:/i.test(h)) return true;

  const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  const ipv4 = mapped ? mapped[1] : h;
  const m = ipv4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;

  const octets = m.slice(1).map(value => Number.parseInt(value, 10));
  if (octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b, c] = octets;

  if (a === 0 || a === 10 || a === 127 || a === 255) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && b >= 18 && b <= 19) return true;
  return false;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h === 'ip6-localhost' ||
    h === 'ip6-loopback' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local')
  ) {
    return true;
  }
  return isPrivateOrLocalIpAddress(h);
}

function assertPublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URL credentials are not permitted.');
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new Error('URL host is not permitted.');
  }
  return parsed;
}

function resolveRedirectUrl(baseUrl: URL, locationHeader: string | null): URL {
  if (!locationHeader) throw new Error('Redirect response is missing a Location header.');
  return assertPublicHttpUrl(new URL(locationHeader, baseUrl).toString());
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_URL_LENGTH = 2_048;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const READABLE_CONTENT_TYPES = ['text/html', 'text/plain', 'application/xhtml+xml'];

type LookupResult = Array<{ address: string; family: number }>;

type FetchUrlDependencies = {
  fetchImpl: typeof fetch;
  lookupImpl: (hostname: string) => Promise<LookupResult>;
  timeoutMs: number;
  maxBytes: number;
};

class PublicFetchError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
}

function validateUrl(rawUrl: unknown): URL {
  if (typeof rawUrl !== 'string' || !rawUrl.trim() || rawUrl.length > MAX_URL_LENGTH) {
    throw new PublicFetchError(400, 'INVALID_URL', 'Enter a valid URL.');
  }
  try {
    return assertPublicHttpUrl(rawUrl.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/invalid url/i.test(message)) {
      throw new PublicFetchError(400, 'INVALID_URL', 'Enter a valid URL.');
    }
    throw new PublicFetchError(400, 'BLOCKED_URL', 'This URL cannot be imported.');
  }
}

async function assertPublicDns(
  hostname: string,
  lookupImpl: FetchUrlDependencies['lookupImpl'],
  signal: AbortSignal,
) {
  let addresses: LookupResult;
  try {
    addresses = await Promise.race([
      lookupImpl(hostname),
      new Promise<never>((_, reject) => {
        if (signal.aborted) {
          reject(new PublicFetchError(504, 'FETCH_TIMEOUT', 'The website took too long to respond.'));
          return;
        }
        signal.addEventListener('abort', () => {
          reject(new PublicFetchError(504, 'FETCH_TIMEOUT', 'The website took too long to respond.'));
        }, { once: true });
      }),
    ]);
  } catch {
    if (signal.aborted) {
      throw new PublicFetchError(504, 'FETCH_TIMEOUT', 'The website took too long to respond.');
    }
    throw new PublicFetchError(422, 'UNREADABLE_URL', 'The website address could not be resolved.');
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrLocalIpAddress(address))) {
    throw new PublicFetchError(400, 'BLOCKED_URL', 'This URL cannot be imported.');
  }
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PublicFetchError(413, 'RESPONSE_TOO_LARGE', 'The page is too large to import.');
  }

  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new PublicFetchError(413, 'RESPONSE_TOO_LARGE', 'The page is too large to import.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

async function fetchPublicContent(initialUrl: URL, deps: FetchUrlDependencies): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deps.timeoutMs);
  let currentUrl = initialUrl;

  try {
    for (let redirects = 0; redirects <= MAX_PUBLIC_FETCH_REDIRECTS; redirects += 1) {
      await assertPublicDns(currentUrl.hostname, deps.lookupImpl, controller.signal);

      let response: Response;
      try {
        response = await deps.fetchImpl(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            Accept: 'text/html,text/plain,application/xhtml+xml;q=0.9',
            'User-Agent': 'WiseResume-URL-Importer/1.0',
          },
        });
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          throw new PublicFetchError(504, 'FETCH_TIMEOUT', 'The website took too long to respond.');
        }
        throw new PublicFetchError(502, 'FETCH_FAILED', 'The website could not be reached.');
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirects === MAX_PUBLIC_FETCH_REDIRECTS) {
          throw new PublicFetchError(422, 'TOO_MANY_REDIRECTS', 'The website redirected too many times.');
        }
        try {
          currentUrl = resolveRedirectUrl(currentUrl, response.headers.get('location'));
        } catch {
          throw new PublicFetchError(400, 'BLOCKED_URL', 'This URL cannot be imported.');
        }
        continue;
      }

      if (!response.ok) {
        throw new PublicFetchError(502, 'UPSTREAM_ERROR', 'The website did not return readable content.');
      }

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (contentType && !READABLE_CONTENT_TYPES.some(type => contentType.startsWith(type))) {
        throw new PublicFetchError(415, 'UNREADABLE_CONTENT', 'The URL does not contain a readable web page.');
      }

      const html = await readLimitedText(response, deps.maxBytes);
      if (!html.trim()) {
        throw new PublicFetchError(422, 'UNREADABLE_CONTENT', 'The website returned no readable content.');
      }
      return html;
    }
  } finally {
    clearTimeout(timeout);
  }

  throw new PublicFetchError(422, 'TOO_MANY_REDIRECTS', 'The website redirected too many times.');
}

export function createFetchUrlHandler(overrides: Partial<FetchUrlDependencies> = {}) {
  const deps: FetchUrlDependencies = {
    fetchImpl: overrides.fetchImpl ?? fetch,
    lookupImpl: overrides.lookupImpl ?? (hostname => lookup(hostname, { all: true, verbatim: true })),
    timeoutMs: overrides.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBytes: overrides.maxBytes ?? MAX_PUBLIC_FETCH_BYTES,
  };

  return async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Use POST to import a URL.' });
    }

    try {
      const url = validateUrl(parseBody(req).url);
      const html = await fetchPublicContent(url, deps);
      return res.status(200).json({ html });
    } catch (error) {
      if (error instanceof PublicFetchError) {
        return res.status(error.status).json({ code: error.code, error: error.message });
      }
      return res.status(500).json({ code: 'IMPORT_FAILED', error: 'The URL could not be imported.' });
    }
  };
}

export default createFetchUrlHandler();
