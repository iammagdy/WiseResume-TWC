import type { VercelRequest, VercelResponse } from '@vercel/node';
import dns from 'dns';
import http from 'http';
import https from 'https';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { Client, Databases } from 'node-appwrite';

const MAX_PUBLIC_FETCH_REDIRECTS = 5;
const MAX_PUBLIC_FETCH_BYTES = 2 * 1024 * 1024;

function parseIpv6(address: string): number[] | null {
  const h = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h.includes(':')) return null;
  const pieces = h.split('::');
  if (pieces.length > 2) return null;
  const parsePart = (part: string): string[] => part ? part.split(':') : [];
  const expandIpv4Tail = (parts: string[]) => {
    const last = parts.at(-1);
    if (!last || !last.includes('.')) return parts;
    const octets = last.split('.').map(value => Number(value));
    if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return [];
    return [...parts.slice(0, -1), ((octets[0] << 8) | octets[1]).toString(16), ((octets[2] << 8) | octets[3]).toString(16)];
  };
  const left = expandIpv4Tail(parsePart(pieces[0]));
  const right = expandIpv4Tail(parsePart(pieces[1] || ''));
  if ((!left.length && pieces[0]) || (!right.length && pieces[1])) return null;
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (pieces.length === 1 && missing !== 0)) return null;
  const groups = pieces.length === 2 ? [...left, ...Array(missing).fill('0'), ...right] : left;
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return groups.flatMap(group => {
    const value = Number.parseInt(group, 16);
    return [value >> 8, value & 0xff];
  });
}

function isPrivateOrLocalIpAddress(address: string): boolean {
  const h = address.toLowerCase().replace(/^\[|\]$/g, '');
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const octets = ipv4.slice(1).map(value => Number.parseInt(value, 10));
    if (octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
    const [a, b, c] = octets;
    // RFC 1918, loopback, link-local/metadata, CGNAT, documentation, benchmark,
    // multicast, and IANA-reserved IPv4 ranges are never safe fetch destinations.
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168))
      || (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100))
      || (a === 203 && b === 0 && c === 113);
  }

  const bytes = parseIpv6(h);
  // A hostname is not an IP literal; DNS validation performs the strict
  // address check after it resolves. Invalid resolver output is not accepted
  // by Node's lookup API, so treating names as non-IP here is intentional.
  if (!bytes) return false;
  const isPrefix = (...prefix: number[]) => prefix.every((value, index) => bytes[index] === value);
  const isMappedIpv4 = bytes.slice(0, 10).every(value => value === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (isMappedIpv4) return isPrivateOrLocalIpAddress(bytes.slice(12).join('.'));
  if (bytes.slice(0, 12).every(value => value === 0)) return true; // unspecified, loopback, and IPv4-compatible
  // Unique-local, link-local, multicast, documentation, benchmark, and tunnel
  // ranges are not acceptable as server-side import targets.
  return (bytes[0] & 0xfe) === 0xfc
    || bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80
    || bytes[0] === 0xff
    || isPrefix(0x20, 0x01, 0x0d, 0xb8)
    || isPrefix(0x20, 0x01, 0x00, 0x02)
    || isPrefix(0x20, 0x01, 0x00, 0x00)
    || bytes[0] === 0x20 && bytes[1] === 0x02;
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
type ResolvedAddress = LookupResult[number];
type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

type FetchUrlDependencies = {
  requestImpl: (url: URL, resolved: ResolvedAddress, signal: AbortSignal) => Promise<Response>;
  lookupImpl: (hostname: string) => Promise<LookupResult>;
  verifyJwtImpl: (jwt: string) => Promise<string>;
  rateLimitImpl: (userId: string) => Promise<RateLimitDecision>;
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
): Promise<ResolvedAddress> {
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
  return addresses[0];
}

function pinnedHttpRequest(url: URL, resolved: ResolvedAddress, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(url, {
      method: 'GET',
      signal,
      servername: url.protocol === 'https:' ? url.hostname : undefined,
      headers: {
        Accept: 'text/html,text/plain,application/xhtml+xml;q=0.9',
        'User-Agent': 'WiseResume-URL-Importer/1.0',
      },
      lookup: (_hostname, _options, callback) => callback(null, resolved.address, resolved.family),
    }, incoming => {
      const headers = new Headers();
      for (const [name, rawValue] of Object.entries(incoming.headers)) {
        if (Array.isArray(rawValue)) {
          rawValue.forEach(value => headers.append(name, value));
        } else if (rawValue !== undefined) {
          headers.set(name, rawValue);
        }
      }
      const body = Readable.toWeb(incoming) as unknown as BodyInit;
      resolve(new Response(body, {
        status: incoming.statusCode || 502,
        statusText: incoming.statusMessage,
        headers,
      }));
    });
    request.on('error', reject);
    request.end();
  });
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
      const resolved = await assertPublicDns(currentUrl.hostname, deps.lookupImpl, controller.signal);

      let response: Response;
      try {
        response = await deps.requestImpl(currentUrl, resolved, controller.signal);
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

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID
  || process.env.VITE_APPWRITE_PROJECT_ID
  || process.env.APPWRITE_FUNCTION_PROJECT_ID
  || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const RATE_LIMIT_COLLECTION = 'portfolio_session_rate_limits';
const DATABASE_ID = 'main';

async function verifyAppwriteJwt(jwt: string): Promise<string> {
  if (!APPWRITE_PROJECT_ID) {
    throw new PublicFetchError(503, 'AUTH_UNAVAILABLE', 'URL import is temporarily unavailable.');
  }
  const response = await fetch(`${APPWRITE_ENDPOINT.replace(/\/$/, '')}/account`, {
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-JWT': jwt,
    },
  });
  if (!response.ok) throw new PublicFetchError(401, 'AUTH_REQUIRED', 'Sign in to import a URL.');
  const account = await response.json() as { $id?: string };
  if (!account.$id) throw new PublicFetchError(401, 'AUTH_REQUIRED', 'Sign in to import a URL.');
  return account.$id;
}

function getRateLimitDb(): Databases {
  if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) throw new Error('rate limit unavailable');
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

async function consumeRateLimitWindow(
  db: Databases,
  userId: string,
  label: string,
  windowMs: number,
  limit: number,
  now = Date.now(),
): Promise<RateLimitDecision> {
  const documentId = createHash('sha256').update(`fetch-url:${label}:${userId}`).digest('hex').slice(0, 36);
  const resetAt = new Date(now + windowMs).toISOString();
  try {
    const document = await db.getDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, documentId);
    const currentReset = Date.parse(String(document.reset_at || ''));
    if (!Number.isFinite(currentReset) || currentReset <= now) {
      await db.updateDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, documentId, { count: 1, reset_at: resetAt });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const count = Number(document.count || 0);
    if (count >= limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((currentReset - now) / 1000)) };
    }
    await db.updateDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, documentId, { count: count + 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    if ((error as { code?: number })?.code !== 404) throw error;
    await db.createDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, documentId, { count: 1, reset_at: resetAt });
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

async function enforceDurableRateLimit(userId: string): Promise<RateLimitDecision> {
  const db = getRateLimitDb();
  const burst = await consumeRateLimitWindow(db, userId, 'minute', 60_000, 6);
  if (!burst.allowed) return burst;
  return consumeRateLimitWindow(db, userId, 'hour', 60 * 60_000, 30);
}

function bearerToken(req: VercelRequest): string {
  const raw = req.headers.authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const match = typeof value === 'string' ? /^Bearer\s+(\S+)$/i.exec(value.trim()) : null;
  return match?.[1] || '';
}

export function createFetchUrlHandler(overrides: Partial<FetchUrlDependencies> = {}) {
  const deps: FetchUrlDependencies = {
    requestImpl: overrides.requestImpl ?? pinnedHttpRequest,
    lookupImpl: overrides.lookupImpl ?? (hostname => dns.promises.lookup(hostname, { all: true, verbatim: true })),
    verifyJwtImpl: overrides.verifyJwtImpl ?? verifyAppwriteJwt,
    rateLimitImpl: overrides.rateLimitImpl ?? enforceDurableRateLimit,
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
      const jwt = bearerToken(req);
      if (!jwt) {
        throw new PublicFetchError(401, 'AUTH_REQUIRED', 'Sign in to import a URL.');
      }
      let userId: string;
      try {
        userId = await deps.verifyJwtImpl(jwt);
      } catch (error) {
        if (error instanceof PublicFetchError) throw error;
        throw new PublicFetchError(401, 'AUTH_REQUIRED', 'Sign in to import a URL.');
      }
      let rateLimit: RateLimitDecision;
      try {
        rateLimit = await deps.rateLimitImpl(userId);
      } catch {
        throw new PublicFetchError(503, 'RATE_LIMIT_UNAVAILABLE', 'URL import is temporarily unavailable.');
      }
      if (!rateLimit.allowed) {
        res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
        throw new PublicFetchError(429, 'RATE_LIMITED', 'Too many URL imports. Try again later.');
      }
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
