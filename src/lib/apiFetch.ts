/**
 * Authenticated JSON fetch wrapper for `/api/data/*` endpoints.
 *
 * In DEV: posts directly to the relative `/api/data/*` paths, which Vite
 * proxies to the local Express server on :5001 (see `server/index.ts`).
 *
 * In PROD (Hostinger static hosting at resume.thewise.cloud): there is NO
 * Express server — the deploy is a static `lftp mirror` of `dist/`, and
 * `public/.htaccess` rewrites every non-existent path to `index.html`.
 * A relative `/api/data/me` would therefore return the SPA HTML with
 * `200 OK + text/html`, JSON.parse would silently fail, and the dashboard
 * would render with no premium plan, no resumes, and an "AI unavailable"
 * badge (this was the v3.5.6 production regression).
 *
 * The prod path translates each `/api/data/*` route to either the matching
 * Supabase Edge Function (`me`) or a direct PostgREST query against the
 * underlying table, signed with the bridge JWT so RLS policies enforce
 * per-user access. Response shapes are preserved exactly so call sites do
 * not need to change.
 *
 * Bridge JWT authentication: the bridge token is signed with the same
 * SUPABASE_JWT_SECRET that PostgREST uses, so Supabase accepts it and RLS
 * `auth.uid() = user_id` predicates resolve to the correct supabaseUserId.
 */
import { getToken, getUserId } from './supabaseBridge';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConstants';

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export class ApiFetchError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, query?: ApiFetchOptions['query']): string {
  if (!query) return path;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Production routing for `/api/data/*` requests.
 * Returns null for paths that have no production mapping yet — those should
 * fall through to the dev path (which will fail loudly in prod, surfacing
 * the gap instead of silently returning empty data).
 *
 * Each entry maps the Express response shape exactly so call sites stay
 * unchanged. PostgREST returns bare arrays; we wrap them when the Express
 * handler does (e.g. `{ resumes: [...] }`).
 */
type ProdRoute = {
  /** When set, skip the network call and synthesize this response. Used for
   *  endpoints whose Express handlers are hardcoded stubs. */
  synthetic?: unknown;
  url?: string;
  method?: string;
  body?: unknown;
  extraHeaders?: Record<string, string>;
  /** Transform the raw PostgREST/edge-function response into the legacy Express shape. */
  transform?: (raw: unknown) => unknown;
  /** Treat empty PostgREST result as a 404. */
  emptyAs404?: boolean;
};

function resolveProdRoute(path: string, method: string, body: unknown): ProdRoute | null {
  const base = SUPABASE_URL.replace(/\/+$/, '');

  // ── /api/data/me → me edge function ─────────────────────────────────────
  if (path === '/api/data/me' && method === 'GET') {
    return { url: `${base}/functions/v1/me`, method: 'GET' };
  }

  const userId = getUserId();
  if (!userId) return null; // PostgREST routes need the bridge identity.

  const u = encodeURIComponent(userId);

  // ── /api/data/resumes ───────────────────────────────────────────────────
  if (path === '/api/data/resumes') {
    if (method === 'GET') {
      return {
        url: `${base}/rest/v1/resumes?user_id=eq.${u}&select=*&order=updated_at.desc`,
        method: 'GET',
        transform: (raw) => ({ resumes: Array.isArray(raw) ? raw : [] }),
      };
    }
    if (method === 'POST') {
      const insertBody = { ...(body as Record<string, unknown> || {}), user_id: userId };
      return {
        url: `${base}/rest/v1/resumes?select=*`,
        method: 'POST',
        body: insertBody,
        extraHeaders: { Prefer: 'return=representation' },
        transform: (raw) => {
          const arr = Array.isArray(raw) ? raw : [raw];
          return { resume: arr[0] };
        },
      };
    }
    if (method === 'DELETE') {
      const ids = (body as { ids?: unknown })?.ids;
      if (!Array.isArray(ids) || ids.length === 0) {
        return { url: `${base}/rest/v1/resumes?id=eq.never`, method: 'DELETE', transform: () => ({}) };
      }
      const list = ids.map((id) => encodeURIComponent(String(id))).join(',');
      return {
        url: `${base}/rest/v1/resumes?id=in.(${list})&user_id=eq.${u}`,
        method: 'DELETE',
        transform: () => ({}),
      };
    }
  }

  // ── /api/data/resumes/exists/:id ────────────────────────────────────────
  const existsMatch = path.match(/^\/api\/data\/resumes\/exists\/([^/]+)$/);
  if (existsMatch && method === 'GET') {
    const id = encodeURIComponent(existsMatch[1]);
    return {
      url: `${base}/rest/v1/resumes?id=eq.${id}&user_id=eq.${u}&select=id&limit=1`,
      method: 'GET',
      transform: (raw) => ({ exists: Array.isArray(raw) && raw.length > 0 }),
    };
  }

  // ── /api/data/resumes/:id ───────────────────────────────────────────────
  const resumeIdMatch = path.match(/^\/api\/data\/resumes\/([^/]+)$/);
  if (resumeIdMatch) {
    const id = encodeURIComponent(resumeIdMatch[1]);
    if (method === 'GET') {
      return {
        url: `${base}/rest/v1/resumes?id=eq.${id}&user_id=eq.${u}&select=*&limit=1`,
        method: 'GET',
        emptyAs404: true,
        transform: (raw) => ({ resume: Array.isArray(raw) ? raw[0] : raw }),
      };
    }
    if (method === 'PATCH') {
      return {
        url: `${base}/rest/v1/resumes?id=eq.${id}&user_id=eq.${u}&select=*`,
        method: 'PATCH',
        body,
        extraHeaders: { Prefer: 'return=representation' },
        transform: (raw) => {
          const arr = Array.isArray(raw) ? raw : [raw];
          return { resume: arr[0] };
        },
      };
    }
    if (method === 'DELETE') {
      return {
        url: `${base}/rest/v1/resumes?id=eq.${id}&user_id=eq.${u}`,
        method: 'DELETE',
        transform: () => ({}),
      };
    }
  }

  // ── /api/data/profile GET / PATCH ───────────────────────────────────────
  if (path === '/api/data/profile') {
    if (method === 'GET') {
      return {
        url: `${base}/rest/v1/profiles?user_id=eq.${u}&select=*&limit=1`,
        method: 'GET',
        transform: (raw) => ({ profile: Array.isArray(raw) && raw.length > 0 ? raw[0] : null }),
      };
    }
    if (method === 'PATCH') {
      // Server returns `{ profile: row }` — preserve the same shape so any
      // future caller that destructures `.profile` keeps working.
      return {
        url: `${base}/rest/v1/profiles?user_id=eq.${u}&select=*`,
        method: 'PATCH',
        body: { ...(body as Record<string, unknown> || {}), user_id: userId },
        extraHeaders: { Prefer: 'return=representation,resolution=merge-duplicates' },
        transform: (raw) => {
          const arr = Array.isArray(raw) ? raw : [raw];
          return { profile: arr[0] ?? null };
        },
      };
    }
  }

  // ── /api/data/notifications ─────────────────────────────────────────────
  // The Express handlers for unread-count / mark-* / DELETE are hardcoded
  // stubs (`{ count: 0 }`, `{ ok: true }`); reproduce those shapes
  // synthetically so prod stays in lock-step with dev. Only the LIST
  // endpoint actually queries the table.
  if (path === '/api/data/notifications' && method === 'GET') {
    return {
      url: `${base}/rest/v1/notifications?user_id=eq.${u}&select=*&order=created_at.desc&limit=50`,
      method: 'GET',
      transform: (raw) => ({ notifications: Array.isArray(raw) ? raw : [] }),
    };
  }
  if (path === '/api/data/notifications/unread-count' && method === 'GET') {
    return { synthetic: { count: 0 } };
  }
  if (path === '/api/data/notifications/mark-read' && method === 'POST') {
    return { synthetic: { ok: true } };
  }
  if (path === '/api/data/notifications/mark-all-read' && method === 'POST') {
    return { synthetic: { ok: true } };
  }
  if (path === '/api/data/notifications' && method === 'DELETE') {
    return { synthetic: { ok: true } };
  }
  if (/^\/api\/data\/notifications\/[^/]+$/.test(path) && method === 'DELETE') {
    return { synthetic: { ok: true } };
  }

  // ── /api/data/jobs ──────────────────────────────────────────────────────
  // Express handler is a hardcoded `{ jobs: [] }` stub (no jobs table yet).
  if (path === '/api/data/jobs' && method === 'GET') {
    return { synthetic: { jobs: [] } };
  }

  return null;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const method = opts.method ?? 'GET';
  const token = getToken();

  // Production routing: translate /api/data/* to Supabase calls.
  if (!import.meta.env.DEV && path.startsWith('/api/data/')) {
    const route = resolveProdRoute(path, method, opts.body);
    if (route) {
      // Synthetic response — used for endpoints whose Express handlers
      // are hardcoded stubs (notifications mark-*, unread-count, jobs list).
      if (route.synthetic !== undefined) {
        return route.synthetic as T;
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
        apikey: SUPABASE_ANON_KEY,
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (route.body !== undefined) headers['Content-Type'] = 'application/json';
      if (route.extraHeaders) Object.assign(headers, route.extraHeaders);

      const res = await fetch(buildUrl(route.url!, opts.query), {
        method: route.method!,
        headers,
        body: route.body !== undefined ? JSON.stringify(route.body) : undefined,
        signal: opts.signal,
      });

      const ct = res.headers.get('content-type') || '';
      let raw: unknown = null;
      if (ct.includes('application/json')) {
        raw = await res.json().catch(() => null);
      } else if (res.status !== 204) {
        raw = await res.text().catch(() => null);
      }

      if (!res.ok) {
        const message =
          raw && typeof raw === 'object' && 'message' in raw && typeof (raw as { message: unknown }).message === 'string'
            ? (raw as { message: string }).message
            : `Request failed (${res.status})`;
        throw new ApiFetchError(res.status, message, raw);
      }

      // PostgREST 204 No Content for DELETE/PATCH-no-prefer cases.
      if (route.emptyAs404 && Array.isArray(raw) && raw.length === 0) {
        throw new ApiFetchError(404, 'Not found', { error: 'Not found' });
      }

      const shaped = route.transform ? route.transform(raw) : raw;
      return shaped as T;
    }
    // No prod mapping for this path — surface a clear error rather than
    // silently returning HTML (which is what the broken v3.5.6 build did).
    throw new ApiFetchError(
      501,
      `apiFetch: no production routing for ${method} ${path}. Add it to resolveProdRoute().`,
      null,
    );
  }

  // Dev path: hit the local Express server on the relative URL.
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const ct = res.headers.get('content-type') || '';
  let payload: unknown = null;
  if (ct.includes('application/json')) {
    payload = await res.json().catch(() => null);
  } else if (res.status !== 204) {
    payload = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const message = (payload && typeof payload === 'object' && 'error' in payload
      && typeof (payload as { error: unknown }).error === 'string')
      ? (payload as { error: string }).error
      : `Request failed (${res.status})`;
    throw new ApiFetchError(res.status, message, payload);
  }

  return payload as T;
}
