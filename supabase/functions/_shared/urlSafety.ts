/**
 * URL safety helper used to validate user-supplied "bring your own server"
 * URLs (currently the Ollama BYOK base_url, AI-1 in AI_AUDIT.md).
 *
 * Threats addressed:
 *   - SSRF via cloud metadata endpoints (e.g. 169.254.169.254) and
 *     RFC1918 / link-local / loopback / IPv4-mapped-private addresses.
 *   - Non-HTTP(S) schemes (file://, gopher://, ftp://, ...).
 *   - Oversized URLs used as exfiltration / log-noise primitives.
 *   - Unusual ports outside the small set Ollama is expected to listen on.
 *   - DNS rebinding: callers `validateUrl()` once at write-time and again
 *     at request-time right before the outbound `fetch`, so a hostname
 *     that flips from public to private between the two checks is
 *     rejected (`assertSameSafeIps`).
 *
 * Dev-only escape hatch: setting the env flag
 * `ALLOW_LOOPBACK_OLLAMA_DEV=true` lets `localhost` / `127.0.0.1` through
 * for local development. Production deployments must leave it unset.
 */

export const MAX_URL_LENGTH = 2048;

/**
 * Allowed destination ports.
 *  - 443: standard HTTPS (the only scheme allowed in production).
 *  - 11434: Ollama's default listening port (commonly exposed via HTTPS
 *    by self-hosted Ollama deployments behind a reverse proxy).
 *
 * Port 80 is intentionally NOT allowed — it would only ever apply to
 * the dev loopback escape hatch, and even there 11434 is the right port.
 */
export const ALLOWED_PORTS: ReadonlySet<number> = new Set([443, 11434]);

const DEV_LOOPBACK_ENV_FLAG = 'ALLOW_LOOPBACK_OLLAMA_DEV';

export type UrlSafetyErrorCode =
  | 'invalid_type'
  | 'empty'
  | 'too_long'
  | 'unparseable'
  | 'has_userinfo'
  | 'bad_scheme'
  | 'no_host'
  | 'bad_port'
  | 'loopback'
  | 'dns_failure'
  | 'dns_empty'
  | 'private_ip'
  | 'rebind_detected';

export interface UrlSafetyOk {
  ok: true;
  /** Normalised URL with trailing slashes stripped. Safe to concatenate paths to. */
  url: string;
  hostname: string;
  port: number;
  /** All resolved IP addresses (A + AAAA) at validation time. */
  ips: string[];
}

export interface UrlSafetyErr {
  ok: false;
  code: UrlSafetyErrorCode;
  message: string;
}

export type UrlSafetyResult = UrlSafetyOk | UrlSafetyErr;

export interface UrlSafetyOptions {
  /**
   * Override for the env-controlled dev escape hatch. Tests pass `true`
   * to exercise the loopback path without setting the env var.
   */
  allowDevLoopback?: boolean;
  /**
   * Injectable DNS resolver, defaults to `Deno.resolveDns`. Tests can
   * replace this to simulate rebinding / private resolutions without
   * touching the real DNS.
   */
  resolveDns?: (hostname: string, recordType: 'A' | 'AAAA') => Promise<string[]>;
}

function devLoopbackFromEnv(): boolean {
  try {
    return (Deno.env.get(DEV_LOOPBACK_ENV_FLAG) ?? '').trim().toLowerCase() === 'true';
  } catch {
    // env access denied — be safe.
    return false;
  }
}

function isIPv4Literal(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function isIPv6Literal(host: string): boolean {
  // hostname from URL strips the surrounding brackets already.
  return host.includes(':');
}

/** RFC1918 + loopback + link-local + CGNAT + reserved IPv4 ranges. */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return true;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = nums;
  if (a === 0) return true;                      // 0.0.0.0/8
  if (a === 10) return true;                     // 10.0.0.0/8 RFC1918
  if (a === 127) return true;                    // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;       // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 RFC1918
  if (a === 192 && b === 168) return true;       // 192.168.0.0/16 RFC1918
  if (a === 192 && b === 0) return true;         // 192.0.0.0/24 IETF, 192.0.2.0/24 TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51) return true;        // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0) return true;         // 203.0.113.0/24 TEST-NET-3
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true;                     // multicast + reserved
  return false;
}

/** Loopback / ULA / link-local / multicast / unspecified IPv6, plus IPv4-mapped-private. */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true; // unspecified + loopback
  // IPv4-mapped IPv6: ::ffff:a.b.c.d  (also allow ::ffff:0:a.b.c.d variants).
  const mappedMatch = lower.match(/::ffff(?::[0-9a-f]{1,4})?:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedMatch) return isPrivateIPv4(mappedMatch[1]);
  // 6to4-style ::a.b.c.d
  const compatMatch = lower.match(/^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (compatMatch) return isPrivateIPv4(compatMatch[1]);
  // First hextet shortcuts.
  const firstHextet = lower.split(':')[0] || '0';
  const head = parseInt(firstHextet, 16);
  if (Number.isNaN(head)) return true;
  if ((head & 0xfe00) === 0xfc00) return true;  // fc00::/7 ULA (fc00..fdff)
  if ((head & 0xffc0) === 0xfe80) return true;  // fe80::/10 link-local
  if ((head & 0xff00) === 0xff00) return true;  // ff00::/8 multicast
  // 2002::/16 6to4 — embedded IPv4 is at hextets 2-3.
  if (head === 0x2002) {
    const hextets = lower.split(':');
    const hi = parseInt(hextets[1] || '0', 16);
    const lo = parseInt(hextets[2] || '0', 16);
    if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
      const a = (hi >> 8) & 0xff;
      const b = hi & 0xff;
      const c = (lo >> 8) & 0xff;
      const d = lo & 0xff;
      if (isPrivateIPv4(`${a}.${b}.${c}.${d}`)) return true;
    }
  }
  return false;
}

export function isPrivateIP(ip: string): boolean {
  return ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0';
}

interface DenoResolverShape {
  resolveDns?: (hostname: string, recordType: 'A' | 'AAAA') => Promise<string[]>;
}

async function defaultResolve(hostname: string, type: 'A' | 'AAAA'): Promise<string[]> {
  const resolver = (Deno as DenoResolverShape).resolveDns;
  if (typeof resolver !== 'function') return [];
  try {
    return await resolver(hostname, type);
  } catch {
    return [];
  }
}

/**
 * Resolve every A and AAAA record for `hostname` using the configured
 * resolver. Returns the union, deduplicated. Returns the literal back
 * if `hostname` is already an IP literal (so callers don't need to
 * special-case the no-DNS path).
 */
export async function resolveAllIps(
  hostname: string,
  resolveDns: (hostname: string, type: 'A' | 'AAAA') => Promise<string[]> = defaultResolve,
): Promise<string[]> {
  if (isIPv4Literal(hostname)) return [hostname];
  if (isIPv6Literal(hostname)) return [hostname];
  const [a, aaaa] = await Promise.all([
    resolveDns(hostname, 'A').catch(() => []),
    resolveDns(hostname, 'AAAA').catch(() => []),
  ]);
  return Array.from(new Set([...(a || []), ...(aaaa || [])]));
}

/**
 * Validate a candidate Ollama base URL. Combines scheme/port/length checks
 * with a DNS lookup so the caller can refuse the URL up-front (write-time
 * enforcement) or refuse a stale row (read-time enforcement).
 *
 * The returned `ips` should be re-checked just before the outbound fetch
 * via `assertSameSafeIps()` to defeat DNS-rebinding races.
 */
export async function validateBaseUrl(
  candidate: unknown,
  options: UrlSafetyOptions = {},
): Promise<UrlSafetyResult> {
  if (typeof candidate !== 'string') {
    return { ok: false, code: 'invalid_type', message: 'Base URL must be a string.' };
  }
  const trimmed = candidate.trim();
  if (!trimmed) {
    return { ok: false, code: 'empty', message: 'Base URL is required.' };
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, code: 'too_long', message: `Base URL must be ${MAX_URL_LENGTH} characters or fewer.` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, code: 'unparseable', message: 'Base URL is not a valid URL (must include scheme, e.g. https://...).' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, code: 'has_userinfo', message: 'Base URL must not contain embedded credentials.' };
  }

  const allowDevLoopback = options.allowDevLoopback ?? devLoopbackFromEnv();
  const hostname = parsed.hostname;
  if (!hostname) {
    return { ok: false, code: 'no_host', message: 'Base URL must include a hostname.' };
  }
  const isLoopback = isLoopbackHostname(hostname);

  if (parsed.protocol !== 'https:') {
    if (parsed.protocol === 'http:' && isLoopback && allowDevLoopback) {
      // Permitted dev escape hatch — fall through.
    } else {
      return {
        ok: false,
        code: 'bad_scheme',
        message: 'Base URL must use https://. Plain http:// is only allowed for localhost when ALLOW_LOOPBACK_OLLAMA_DEV=true.',
      };
    }
  }

  const portStr = parsed.port;
  const port = portStr ? Number(portStr) : (parsed.protocol === 'https:' ? 443 : 80);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, code: 'bad_port', message: 'Base URL has an invalid port.' };
  }
  if (!ALLOWED_PORTS.has(port)) {
    return {
      ok: false,
      code: 'bad_port',
      message: `Port ${port} is not allowed. Use 443 or 11434.`,
    };
  }

  if (isLoopback) {
    if (!allowDevLoopback) {
      return { ok: false, code: 'loopback', message: 'Loopback hosts (localhost / 127.0.0.1) are not allowed in production.' };
    }
    // Skip DNS for loopback dev mode — we already know the destination.
    return {
      ok: true,
      url: parsed.toString().replace(/\/+$/, ''),
      hostname,
      port,
      ips: [hostname === 'localhost' ? '127.0.0.1' : hostname],
    };
  }

  let ips: string[];
  try {
    ips = await resolveAllIps(hostname, options.resolveDns ?? defaultResolve);
  } catch (_e) {
    return { ok: false, code: 'dns_failure', message: 'Could not resolve hostname.' };
  }
  if (!ips || ips.length === 0) {
    return { ok: false, code: 'dns_empty', message: 'Hostname did not resolve to any IP address.' };
  }
  for (const ip of ips) {
    if (isPrivateIP(ip)) {
      return {
        ok: false,
        code: 'private_ip',
        message: `Hostname resolves to a restricted address (${ip}). Public IPs only.`,
      };
    }
  }

  return {
    ok: true,
    url: parsed.toString().replace(/\/+$/, ''),
    hostname,
    port,
    ips,
  };
}

/**
 * IP-pinned fetch — performs an HTTP(S) request whose destination IP is
 * fixed to `pinnedIp` regardless of what DNS would currently return for
 * the URL's hostname. Closes the DNS-rebinding race entirely: even if an
 * attacker flips their record between our `validateBaseUrl()` call and
 * the outbound request, the TLS connection still goes to the IP we
 * already validated as public.
 *
 * Implementation: uses Node's `https`/`http` request API (available in
 * Deno via the node compat layer) which exposes a `lookup` hook. We
 * override the hook to short-circuit DNS and return `pinnedIp`. SNI and
 * TLS certificate verification continue to use the real hostname so
 * cert validation is preserved.
 *
 * Caps response body at 10 MB and aborts on `signal`.
 */
export interface PinnedFetchInit {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  /** Maximum response body bytes (default 10 MB). */
  maxBytes?: number;
  /** Per-request timeout in ms (default 60_000). */
  timeoutMs?: number;
}

export interface PinnedFetchResult {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
}

export async function pinnedFetch(
  targetUrl: string,
  pinnedIp: string,
  init: PinnedFetchInit,
): Promise<PinnedFetchResult> {
  const u = new URL(targetUrl);
  const isHttps = u.protocol === 'https:';
  const port = u.port ? Number(u.port) : (isHttps ? 443 : 80);
  const path = (u.pathname || '/') + (u.search || '');
  const maxBytes = init.maxBytes ?? 10 * 1024 * 1024;
  const timeoutMs = init.timeoutMs ?? 60_000;

  // Defence-in-depth: refuse to even attempt the connection if the pinned
  // IP somehow ended up in a private range (callers should have filtered
  // already via validateBaseUrl, but never trust the caller).
  if (isPrivateIP(pinnedIp)) {
    throw new Error(`pinnedFetch refused: ${pinnedIp} is in a restricted range.`);
  }

  // Minimal typed surface of the Node compat http(s) request API we touch.
  // Defining concrete types here keeps the security-critical transport
  // statically checked even though the underlying module is dynamically
  // imported.
  type LookupCallback = (err: Error | null, address: string, family: 4 | 6) => void;
  type LookupFn = (
    hostname: string,
    options: unknown,
    callback: LookupCallback,
  ) => void;

  interface NodeRequestOptions {
    hostname: string;
    servername: string;
    port: number;
    path: string;
    method: string;
    headers: Record<string, string>;
    timeout: number;
    lookup: LookupFn;
  }

  interface NodeIncomingMessage {
    statusCode?: number;
    headers: Record<string, string | string[] | undefined>;
    on(event: 'data', cb: (chunk: Uint8Array) => void): void;
    on(event: 'end', cb: () => void): void;
    on(event: 'error', cb: (err: Error) => void): void;
  }

  interface NodeClientRequest {
    on(event: 'error', cb: (err: Error) => void): void;
    on(event: 'timeout', cb: () => void): void;
    write(chunk: string): void;
    end(): void;
    destroy(err?: Error): void;
  }

  type RequestFn = (
    options: NodeRequestOptions,
    callback: (res: NodeIncomingMessage) => void,
  ) => NodeClientRequest;

  interface NodeHttpModule {
    request: RequestFn;
  }

  // Dynamically import the node compat module so this file remains
  // importable in pure-Deno test contexts that don't pull in node:*.
  const mod: NodeHttpModule = isHttps
    ? await import('node:https') as unknown as NodeHttpModule
    : await import('node:http') as unknown as NodeHttpModule;
  const requestFn = mod.request;

  const family: 4 | 6 = pinnedIp.includes(':') ? 6 : 4;

  return await new Promise<PinnedFetchResult>((resolve, reject) => {
    if (init.signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    let req: NodeClientRequest;

    const abortHandler = () => {
      try { req?.destroy(new Error('aborted')); } catch { /* noop */ }
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };

    req = requestFn(
      {
        hostname: u.hostname,
        servername: u.hostname, // SNI = real hostname → cert validation works
        port,
        path,
        method: init.method,
        headers: init.headers,
        timeout: timeoutMs,
        // The IP-pinning hook: bypass DNS entirely.
        lookup: (_hostname, _opts, cb) => cb(null, pinnedIp, family),
      },
      (res) => {
        const chunks: Uint8Array[] = [];
        let total = 0;
        res.on('data', (chunk: Uint8Array) => {
          total += chunk.byteLength;
          if (total > maxBytes) {
            try { req.destroy(new Error('response too large')); } catch { /* noop */ }
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          if (init.signal) init.signal.removeEventListener('abort', abortHandler);
          const buf = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
          // Flatten Node's headers (which can be string | string[]) into a
          // simple Record<string,string> with comma-joined dupes.
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers ?? {})) {
            headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v ?? '');
          }
          resolve({
            status: typeof res.statusCode === 'number' ? res.statusCode : 0,
            headers,
            bodyText: new TextDecoder().decode(buf),
          });
        });
        res.on('error', (e: Error) => {
          if (init.signal) init.signal.removeEventListener('abort', abortHandler);
          reject(e);
        });
      },
    );

    req.on('error', (e: Error) => {
      if (init.signal) init.signal.removeEventListener('abort', abortHandler);
      reject(e);
    });
    req.on('timeout', () => {
      try { req.destroy(new Error('request timed out')); } catch { /* noop */ }
    });

    if (init.signal) init.signal.addEventListener('abort', abortHandler);

    if (init.body) req.write(init.body);
    req.end();
  });
}

/**
 * DNS-rebinding defence. After a successful `validateBaseUrl()`, call this
 * immediately before the outbound `fetch()` to confirm the hostname still
 * resolves to safe, public IPs. If a rebinding attacker has flipped the
 * record to a private IP since the original validation, this rejects.
 *
 * We deliberately re-resolve rather than trusting the cached IP set:
 * Deno's `fetch` performs its own resolution we cannot intercept, but the
 * DNS TTL window for the actual fetch is shrunk to milliseconds after this
 * call, which defeats classic rebinding (which needs seconds-to-minutes
 * between lookups).
 */
export async function assertSameSafeIps(
  hostname: string,
  options: { resolveDns?: UrlSafetyOptions['resolveDns']; allowDevLoopback?: boolean } = {},
): Promise<UrlSafetyResult> {
  const allowDevLoopback = options.allowDevLoopback ?? devLoopbackFromEnv();
  if (isLoopbackHostname(hostname)) {
    if (!allowDevLoopback) {
      return { ok: false, code: 'loopback', message: 'Loopback hosts are not allowed.' };
    }
    return {
      ok: true,
      url: hostname,
      hostname,
      port: 0,
      ips: [hostname === 'localhost' ? '127.0.0.1' : hostname],
    };
  }
  let ips: string[];
  try {
    ips = await resolveAllIps(hostname, options.resolveDns ?? defaultResolve);
  } catch {
    return { ok: false, code: 'dns_failure', message: 'Could not resolve hostname.' };
  }
  if (!ips.length) {
    return { ok: false, code: 'dns_empty', message: 'Hostname did not resolve to any IP address.' };
  }
  for (const ip of ips) {
    if (isPrivateIP(ip)) {
      return {
        ok: false,
        code: 'rebind_detected',
        message: `Hostname now resolves to a restricted address (${ip}). Refusing to fetch.`,
      };
    }
  }
  return { ok: true, url: hostname, hostname, port: 0, ips };
}
