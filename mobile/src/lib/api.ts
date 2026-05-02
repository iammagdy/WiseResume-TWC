import { getConfig } from './config';
import { secureStorage } from './secureStore';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface CallOptions {
  body?: unknown;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined | null>;
  skipAuth?: boolean;
  signal?: AbortSignal;
  extraHeaders?: Record<string, string>;
}

const cfg = getConfig();

/**
 * Build the URL for a Supabase Edge Function.  The mobile binary
 * always talks directly to `${SUPABASE_URL}/functions/v1/<name>`;
 * there is no Express dev proxy in this codebase.
 */
export function fnUrl(name: string): string {
  return `${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/${name}`;
}

export function restUrl(table: string): string {
  return `${cfg.supabaseUrl.replace(/\/+$/, '')}/rest/v1/${table}`;
}

function buildQueryString(query?: CallOptions['query']): string {
  if (!query) return '';
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function buildAuthHeaders(skipAuth: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    apikey: cfg.supabaseAnonKey,
  };
  if (!skipAuth) {
    const token = await secureStorage.getItem('wr.bridge.token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Call a Supabase Edge Function and return the parsed JSON body.
 * Throws ApiError on non-2xx.
 */
export async function callEdgeFunction<T = unknown>(name: string, opts: CallOptions = {}): Promise<T> {
  const url = fnUrl(name) + buildQueryString(opts.query);
  const authHeaders = await buildAuthHeaders(opts.skipAuth ?? false);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeaders,
    ...(opts.extraHeaders ?? {}),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const message =
      parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed &&
      typeof (parsed as { error: unknown }).error === 'string'
        ? (parsed as { error: string }).error
        : `Edge function ${name} failed (${res.status})`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

/**
 * PostgREST shortcut for simple table reads. Uses the bridge JWT so
 * RLS policies (`auth.uid() = user_id`) resolve to the signed-in
 * user — same contract as the web client in `src/lib/apiFetch.ts`.
 */
export async function rest<T = unknown>(
  table: string,
  opts: CallOptions & { select?: string } = {},
): Promise<T> {
  const query = { ...(opts.query ?? {}) };
  if (opts.select) query.select = opts.select;
  const url = restUrl(table) + buildQueryString(query);
  const authHeaders = await buildAuthHeaders(opts.skipAuth ?? false);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeaders,
    ...(opts.extraHeaders ?? {}),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new ApiError(res.status, `PostgREST ${table} failed (${res.status})`, parsed);
  }
  return parsed as T;
}
