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
import {
  isImpersonating,
  getImpersonationToken,
  getImpersonationState,
} from './impersonationStore';

/**
 * Resolve the active auth identity for `/api/data/*` calls.
 *
 * Impersonation always takes precedence — when an admin has claimed an
 * impersonation OTP (either same-tab via Act As or in a fresh /act-as tab
 * with no Kinde session), we MUST send the impersonation JWT and address
 * the impersonated user's row. Otherwise we use the admin's own Kinde→
 * Supabase bridge identity. Both values are derived together so the token
 * and userId never disagree mid-request.
 */
function resolveActiveAuth(): { token: string | null; userId: string | null } {
  if (isImpersonating()) {
    const t = getImpersonationToken();
    const s = getImpersonationState();
    return { token: t, userId: s.userId };
  }
  return { token: getToken(), userId: getUserId() };
}

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
   *  endpoints whose Express handlers are hardcoded stubs. May also be an
   *  async fetcher function for routes that need to issue multiple
   *  PostgREST queries and stitch the results (e.g. activity-rows). */
  synthetic?: unknown | (() => Promise<unknown>);
  url?: string;
  method?: string;
  body?: unknown;
  extraHeaders?: Record<string, string>;
  /** Transform the raw PostgREST/edge-function response into the legacy Express shape. */
  transform?: (raw: unknown) => unknown;
  /** Treat empty PostgREST result as a 404. */
  emptyAs404?: boolean;
};

/**
 * Issue an authenticated PostgREST GET against the active identity's bridge
 * token. Used by aggregate routes (activity-rows, job-activity-rows) that
 * need to fan out across multiple tables in a single client call.
 */
async function pgGet<T = unknown>(suffix: string): Promise<T[]> {
  const base = SUPABASE_URL.replace(/\/+$/, '');
  const { token } = resolveActiveAuth();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/rest/v1/${suffix}`, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiFetchError(res.status, `PostgREST ${suffix} failed (${res.status})`, text);
  }
  const json = await res.json().catch(() => []);
  return (Array.isArray(json) ? json : []) as T[];
}

function resolveProdRoute(
  path: string,
  method: string,
  body: unknown,
  query?: ApiFetchOptions['query'],
): ProdRoute | null {
  const base = SUPABASE_URL.replace(/\/+$/, '');

  // ── /api/data/me → me edge function ─────────────────────────────────────
  if (path === '/api/data/me' && method === 'GET') {
    return { url: `${base}/functions/v1/me`, method: 'GET' };
  }

  const { userId } = resolveActiveAuth();
  if (!userId) return null; // PostgREST routes need an active identity.

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
      // Use POST with on_conflict to UPSERT the row. PostgREST PATCH is
      // UPDATE-only — `Prefer: resolution=merge-duplicates` is silently
      // ignored on PATCH, so when no profile row exists yet (e.g. legacy
      // users created before the server-side provisioning helper, or any
      // case where the JIT bridge upsert failed) every save returned 200
      // with `[]` and the user's name was lost. Routing through POST with
      // on_conflict=user_id makes the call insert-or-update atomically and
      // always returns the persisted row. Server returns `{ profile: row }`
      // — preserve the same shape so call sites stay unchanged.
      return {
        url: `${base}/rest/v1/profiles?on_conflict=user_id&select=*`,
        method: 'POST',
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

  // ── /api/data/portfolios/me ─────────────────────────────────────────────
  // Express returns `{ portfolio: row | null }` from a 1-row PostgREST query
  // against the user's portfolios. Mirror exactly.
  if (path === '/api/data/portfolios/me' && method === 'GET') {
    return {
      url: `${base}/rest/v1/portfolios?user_id=eq.${u}&select=id,username&limit=1`,
      method: 'GET',
      transform: (raw) => ({ portfolio: Array.isArray(raw) && raw.length > 0 ? raw[0] : null }),
    };
  }

  // ── /api/data/activity-rows ─────────────────────────────────────────────
  // Express joins resumes / job_applications / cover_letters into one
  // payload for useActivityStreak. PostgREST has no multi-table fan-out, so
  // synthesize the same shape by issuing parallel SELECTs and stitching the
  // result in `transform`. We use the multi-fetch escape hatch by choosing
  // `synthetic` and performing the fetches inline before returning.
  // (Implemented as a thin wrapper so the synthetic path can do real I/O.)
  if (path === '/api/data/activity-rows' && method === 'GET') {
    const sinceRaw = query && typeof query.since === 'string' ? query.since : '';
    const since = sinceRaw && !Number.isNaN(new Date(sinceRaw).getTime())
      ? new Date(sinceRaw).toISOString()
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const s = encodeURIComponent(since);
    return {
      synthetic: async () => {
        const [resumes, jobApplications, coverLetters] = await Promise.all([
          pgGet(`resumes?user_id=eq.${u}&created_at=gte.${s}&select=created_at`),
          pgGet(`job_applications?user_id=eq.${u}&applied_at=gte.${s}&select=applied_at,status`),
          pgGet(`cover_letters?user_id=eq.${u}&created_at=gte.${s}&select=created_at`),
        ]);
        // tailor_history table not present in current schema — match Express stub.
        return { resumes, jobApplications, coverLetters, tailorHistory: [] };
      },
    };
  }

  // ── /api/data/job-activity-rows ─────────────────────────────────────────
  // Same fan-out as activity-rows but without a `since` window. Express
  // also injects `parent_resume_id: null` on each resume row (column not in
  // current schema) so useJobActivityStats can filter originals vs tailored.
  if (path === '/api/data/job-activity-rows' && method === 'GET') {
    return {
      synthetic: async () => {
        const [resumes, coverLetters, jobApplications] = await Promise.all([
          pgGet<Record<string, unknown>>(`resumes?user_id=eq.${u}&select=id`),
          pgGet(`cover_letters?user_id=eq.${u}&select=id`),
          pgGet(`job_applications?user_id=eq.${u}&select=status,applied_at`),
        ]);
        return {
          resumes: resumes.map((r) => ({ parent_resume_id: null, ...r })),
          coverLetters,
          jobApplications,
          tailorHistory: [],
        };
      },
    };
  }

  // ── /api/data/hr-analytics ──────────────────────────────────────────────
  // The Express dev handler aggregates wisehire_candidates,
  // wisehire_pipeline_events, and wisehire_companies. Those tables exist
  // in Neon today and are being mirrored into Supabase as the WiseHire
  // feature graduates to the prod tier. We attempt the PostgREST queries
  // here so prod sees real data the moment the tables land in Supabase
  // (no client redeploy needed); any individual table that 404s falls
  // back to an empty array so a partial migration doesn't break the page.
  // The auxiliary collections (bulkJobs/briefs/roles/talentViews) are
  // hardcoded empty in dev too — they have no backing tables yet.
  if (path === '/api/data/hr-analytics' && method === 'GET') {
    const rangeRaw = query && typeof query.range === 'string' ? query.range : 'all';
    let sinceFilter = '';
    if (rangeRaw !== 'all') {
      const d = new Date();
      if (rangeRaw === 'week') d.setDate(d.getDate() - 7);
      else if (rangeRaw === 'month') d.setDate(d.getDate() - 30);
      else if (rangeRaw === 'quarter') d.setDate(d.getDate() - 90);
      sinceFilter = encodeURIComponent(d.toISOString());
    }
    const candFilter = sinceFilter
      ? `owner_id=eq.${u}&created_at=gte.${sinceFilter}`
      : `owner_id=eq.${u}`;
    const evtFilter = sinceFilter
      ? `owner_id=eq.${u}&moved_at=gte.${sinceFilter}`
      : `owner_id=eq.${u}`;
    const safe = async <X>(p: Promise<X>): Promise<X | null> => {
      try { return await p; } catch { return null; }
    };
    return {
      synthetic: async () => {
        const [candidatesRaw, eventsRaw, companyRowsRaw] = await Promise.all([
          safe(pgGet<Record<string, unknown>>(
            `wisehire_candidates?${candFilter}&select=id,pipeline_stage,resume_text,created_at`,
          )),
          safe(pgGet<Record<string, unknown>>(
            `wisehire_pipeline_events?${evtFilter}&select=candidate_id,from_stage,to_stage,moved_at&order=moved_at.asc`,
          )),
          safe(pgGet<Record<string, unknown>>(`wisehire_companies?owner_id=eq.${u}&select=id&limit=1`)),
        ]);
        // Map moved_at → created_at to keep parity with the dev handler's
        // SELECT alias (`moved_at AS created_at`) so useHRAnalytics's
        // hire-time math reads the right field name.
        const pipelineEvents = (eventsRaw ?? []).map((e) => ({
          candidate_id: e.candidate_id,
          from_stage: e.from_stage,
          to_stage: e.to_stage,
          created_at: e.moved_at,
        }));
        return {
          candidates: candidatesRaw ?? [],
          pipelineEvents,
          companyId: (companyRowsRaw && companyRowsRaw[0]?.id) ?? null,
          bulkJobs: [],
          briefs: [],
          roles: [],
          talentViews: [],
        };
      },
    };
  }

  // ── /api/data/portfolio-analytics ───────────────────────────────────────
  // Express returns an empty-summary stub until the get_portfolio_analytics
  // RPC is ported. Match exactly.
  if (path === '/api/data/portfolio-analytics' && method === 'GET') {
    return {
      synthetic: {
        visits: [],
        summary: {
          total_visits: 0,
          unique_countries: 0,
          avg_time_seconds: null,
          avg_time_variant_a: null,
          avg_time_variant_b: null,
          visits_variant_a: 0,
          visits_variant_b: 0,
        },
      },
    };
  }

  // ── /api/data/short-links ───────────────────────────────────────────────
  // Express stub: GET → `{ links: [] }`, POST → echo body, DELETE → `{ ok }`.
  if (path === '/api/data/short-links') {
    if (method === 'GET') return { synthetic: { links: [] } };
    if (method === 'POST') {
      const b = (body ?? {}) as Record<string, unknown>;
      const id = typeof b.id === 'string' ? b.id : Math.random().toString(36).slice(2, 7);
      return {
        synthetic: {
          link: { id, click_count: 0, created_at: new Date().toISOString(), ...b },
        },
      };
    }
  }
  if (/^\/api\/data\/short-links\/[^/]+$/.test(path) && method === 'DELETE') {
    return { synthetic: { ok: true } };
  }

  // ── /api/data/resume-shares ─────────────────────────────────────────────
  // Express stub mirrors notifications-style: GET empty, POST/PATCH echo
  // body with synthesised id where missing, DELETE → `{ ok: true }`.
  if (path === '/api/data/resume-shares') {
    if (method === 'GET') return { synthetic: { shares: [] } };
    if (method === 'POST') {
      const b = (body ?? {}) as Record<string, unknown>;
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as { randomUUID: () => string }).randomUUID()
        : `${Date.now()}-${Math.random()}`;
      return { synthetic: { share: { id, ...b } } };
    }
  }
  const shareIdMatch = path.match(/^\/api\/data\/resume-shares\/([^/]+)$/);
  if (shareIdMatch) {
    if (method === 'PATCH') {
      const b = (body ?? {}) as Record<string, unknown>;
      return { synthetic: { share: { id: shareIdMatch[1], ...b } } };
    }
    if (method === 'DELETE') return { synthetic: { ok: true } };
  }

  // ── /api/data/push-subscriptions ────────────────────────────────────────
  // Express stub returns `{ ok: true }` for both POST and DELETE.
  if (path === '/api/data/push-subscriptions' && (method === 'POST' || method === 'DELETE')) {
    return { synthetic: { ok: true } };
  }

  return null;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const method = opts.method ?? 'GET';
  // Impersonation takes precedence over the admin's Kinde bridge token,
  // so requests against /api/data/* address the impersonated user end-to-end.
  const { token } = resolveActiveAuth();

  // Production routing: translate /api/data/* to Supabase calls.
  if (!import.meta.env.DEV && path.startsWith('/api/data/')) {
    const route = resolveProdRoute(path, method, opts.body, opts.query);
    if (route) {
      // Synthetic response — used for endpoints whose Express handlers are
      // hardcoded stubs (notifications mark-*, unread-count, jobs list) or
      // multi-table aggregates that need to fan out (activity-rows). When
      // synthetic is a function it's an async fetcher; otherwise it's a
      // static value that mirrors the legacy Express shape.
      if (route.synthetic !== undefined) {
        if (typeof route.synthetic === 'function') {
          return await (route.synthetic as () => Promise<unknown>)() as T;
        }
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
