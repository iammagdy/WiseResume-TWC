/**
 * Lightweight response helpers for admin-* edge functions.
 *
 * The shared contract:
 *   { success: true, ...data }     OR
 *   { success: false, error: '...' } / { error: '...' } / 4xx-5xx upstream
 *
 * `unwrapAdminResponse` accepts the `{ data, error }` tuple returned by
 * `edgeFunctions.functions.invoke(...)` and either returns a typed payload
 * or throws an `EdgeFunctionError` whose message is safe to surface.
 *
 * This replaces dozens of unchecked `as { success?; error?; … }` casts
 * scattered across DevKit panels.
 */

export interface InvokeError {
  message: string;
  status?: number;
}

export interface InvokeTuple<T = unknown> {
  data: T | null;
  error: InvokeError | null;
}

export class EdgeFunctionError extends Error {
  status?: number;
  notDeployed: boolean;
  raw: unknown;

  constructor(message: string, opts: { status?: number; notDeployed?: boolean; raw?: unknown } = {}) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.status = opts.status;
    this.notDeployed = opts.notDeployed ?? false;
    this.raw = opts.raw;
  }
}

function looksLikeNotDeployed(err: InvokeError): boolean {
  const msg = (err.message ?? '').toLowerCase().trim();

  // The classifier is intentionally narrow: it only fires on signatures that
  // can ONLY come from the network or the Supabase gateway, never from a
  // function that ran and chose to return 404. If an admin function
  // intentionally returns 404 with any body — `{success:false,error:'not_found'}`
  // (Task #21), `{error:'Target user not found'}` (admin-impersonate),
  // `{error:'User not found'}` (admin-wisehire-reset-user), etc. — we surface
  // the function's own message rather than a misleading "deploy this"
  // banner.
  //
  // Signatures that DO mean "function/transport unreachable":
  //   • Browser network failure → "failed to fetch" (Fetch API) or
  //     edgeFunctions.invoke's friendlier rewrite "cannot reach the server".
  //   • Gateway 404 with non-JSON body → the admin-invoker's HTTP-status
  //     fallback "Server error (HTTP 404) — please try again." (the body was
  //     HTML so no `.error` field was found to override the fallback).
  //   • Empty / missing message on a 404 → most likely a network-layer
  //     failure that didn't populate `.message`.
  if (!msg) return err.status === 404;
  if (msg.includes('failed to fetch')) return true;
  if (msg.includes('cannot reach the server')) return true;
  if (msg.includes('server error (http 404)')) return true;

  return false;
}

/**
 * Unwrap a `{ data, error }` tuple. Throws EdgeFunctionError on:
 *   - transport error (`error` set)
 *   - missing payload
 *   - `{ success: false, error }` payload
 *
 * Otherwise returns the (typed) payload object.
 */
export function unwrapAdminResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  tuple: InvokeTuple<unknown>,
  fnName: string,
): T {
  if (tuple.error) {
    const notDeployed = looksLikeNotDeployed(tuple.error);
    throw new EdgeFunctionError(
      notDeployed
        ? `${fnName} not deployed (HTTP ${tuple.error.status ?? '—'})`
        : tuple.error.message,
      { status: tuple.error.status, notDeployed, raw: tuple.error },
    );
  }

  const data = tuple.data;
  if (data === null || data === undefined) {
    throw new EdgeFunctionError(`${fnName} returned no data`, { raw: data });
  }

  if (typeof data !== 'object' || Array.isArray(data)) {
    return data as T;
  }

  const obj = data as Record<string, unknown>;
  if (obj.success === false) {
    const message = typeof obj.error === 'string'
      ? obj.error
      : typeof obj.message === 'string'
        ? obj.message
        : `${fnName} reported failure`;
    throw new EdgeFunctionError(message, { raw: obj });
  }

  return obj as T;
}

/** Soft variant that returns `null` instead of throwing — useful for optional/secondary fetches. */
export function tryUnwrapAdminResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  tuple: InvokeTuple<unknown>,
  fnName: string,
): T | null {
  try {
    return unwrapAdminResponse<T>(tuple, fnName);
  } catch {
    return null;
  }
}

/**
 * Format any thrown value (including EdgeFunctionError) into a human-readable string.
 */
export function formatEdgeError(e: unknown, fallback = 'Unknown error'): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'string') return e;
  return fallback;
}

/**
 * Counterpart to `unwrapAdminResponse` for the local Express admin API
 * (i.e. `/api/admin/...` routes — these are NOT Supabase edge functions and
 * therefore can't go through `edgeFunctions.functions.invoke`). Performs the
 * same error normalization so DevKit panels never call `fetch` directly:
 *   - non-2xx response → throws EdgeFunctionError with `{ error }` body or
 *     `HTTP <status>` fallback (sets `notDeployed` for 404).
 *   - JSON parse failure → throws EdgeFunctionError.
 *   - AbortError → re-thrown so callers can ignore it.
 *
 * Pass an `AbortSignal` to make the request cancellable.
 */
export async function adminApiFetch<T>(
  path: string,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let body: { error?: string } = {};
    try {
      body = (await res.json()) as { error?: string };
    } catch {
      // body wasn't JSON — fall through to status-only message
    }
    throw new EdgeFunctionError(body.error ?? `HTTP ${res.status}`, {
      status: res.status,
      notDeployed: res.status === 404,
      raw: body,
    });
  }
  try {
    return (await res.json()) as T;
  } catch (e) {
    throw new EdgeFunctionError(`${path} returned non-JSON response`, { raw: e });
  }
}
