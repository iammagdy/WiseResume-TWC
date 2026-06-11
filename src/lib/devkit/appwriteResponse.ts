export interface InvokeError {
  message: string;
  status?: number;
}

export interface InvokeTuple<T = unknown> {
  data: T | null;
  error: InvokeError | null;
}

export class AppwriteFunctionError extends Error {
  status?: number;
  notDeployed: boolean;
  raw: unknown;

  constructor(message: string, opts: { status?: number; notDeployed?: boolean; raw?: unknown } = {}) {
    super(message);
    this.name = 'AppwriteFunctionError';
    this.status = opts.status;
    this.notDeployed = opts.notDeployed ?? false;
    this.raw = opts.raw;
  }
}

export class EdgeFunctionError extends AppwriteFunctionError {}

const ADMIN_ENVELOPE_KEYS = new Set(['success', 'requestId', 'code', 'error', 'message']);

/** Strip `{ success, requestId, ... }` wrappers from admin function JSON bodies. */
export function normalizeAdminPayload<T = Record<string, unknown>>(
  obj: Record<string, unknown>,
): T {
  const payloadKeys = Object.keys(obj).filter((key) => !ADMIN_ENVELOPE_KEYS.has(key));

  if (payloadKeys.length === 1 && payloadKeys[0] === 'data' && obj.data !== undefined) {
    return obj.data as T;
  }

  const rest: Record<string, unknown> = {};
  for (const key of payloadKeys) {
    rest[key] = obj[key];
  }
  return rest as T;
}

function looksLikeNotDeployed(err: InvokeError): boolean {
  const msg = (err.message ?? '').toLowerCase().trim();

  if (!msg) return err.status === 404;
  if (msg.includes('failed to fetch')) return true;
  if (msg.includes('cannot reach the server')) return true;
  if (msg.includes('server error (http 404)')) return true;

  return false;
}

export function unwrapAdminResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  tuple: InvokeTuple<unknown>,
  fnName: string,
): T {
  if (tuple.error) {
    const notDeployed = looksLikeNotDeployed(tuple.error);
    throw new AppwriteFunctionError(
      notDeployed
        ? `${fnName} not deployed (HTTP ${tuple.error.status ?? '—'})`
        : tuple.error.message,
      { status: tuple.error.status, notDeployed, raw: tuple.error },
    );
  }

  const data = tuple.data;
  if (data === null || data === undefined) {
    throw new AppwriteFunctionError(`${fnName} returned no data`, { raw: data });
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
    throw new AppwriteFunctionError(message, { raw: obj });
  }

  if (obj.ok === false && typeof obj.error === 'string' && !Array.isArray(obj.results)) {
    throw new AppwriteFunctionError(obj.error, { raw: obj });
  }

  return normalizeAdminPayload<T>(obj);
}

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

export function formatEdgeError(e: unknown, fallback = 'Unknown error'): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'string') return e;
  return fallback;
}

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
      // keep status-only fallback for non-JSON upstream errors
    }
    throw new AppwriteFunctionError(body.error ?? `HTTP ${res.status}`, {
      status: res.status,
      notDeployed: res.status === 404,
      raw: body,
    });
  }
  try {
    return (await res.json()) as T;
  } catch (e) {
    throw new AppwriteFunctionError(`${path} returned non-JSON response`, { raw: e });
  }
}
