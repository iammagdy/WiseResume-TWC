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
  if (err.status === 404) return true;
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('not found');
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
