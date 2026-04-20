/**
 * Authenticated JSON fetch wrapper for `/api/data/*` endpoints.
 *
 * Replaces direct `supabase.from(...)` calls in `src/hooks/**` and
 * `src/pages/**`. Attaches the bridge session token as a Bearer header so
 * the Express server can authenticate the caller without any Supabase
 * round-trip. The token is signed with `SESSION_SECRET` and verified
 * locally on the server (see `validateSupabaseToken` in `server/index.ts`),
 * so the secret no longer needs to match Supabase's JWT secret for these
 * code paths to work.
 */
import { getToken } from './supabaseBridge';

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

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
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
