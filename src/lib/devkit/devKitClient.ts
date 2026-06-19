import { appwriteFunctions } from '@/lib/appwrite-functions';
import { devKitInvokeOptions } from '@/lib/devkit/devKitAuth';
import { normalizeAdminPayload } from '@/lib/devkit/appwriteResponse';

export type DevKitErrorCode =
  | 'APPWRITE_SESSION_EXPIRED'
  | 'DEVKIT_UNAUTHORIZED'
  | 'FUNCTION_NOT_FOUND'
  | 'FUNCTION_RUNTIME_FAILED'
  | 'MISSING_ENV'
  | 'SCHEMA_OR_INDEX_ERROR'
  | 'UNKNOWN_ACTION'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface DevKitError {
  code: DevKitErrorCode;
  message: string;
  status?: number;
  functionId?: string;
  action?: string;
  requestId?: string;
  raw?: unknown;
}

export type DevKitResult<T> =
  | { ok: true; data: T; requestId?: string }
  | { ok: false; error: DevKitError };

export interface DevKitCallOptions {
  action: string;
  payload?: Record<string, unknown>;
  functionId?: string;
  /** Client-side timeout in ms (default 90s). Use longer values for heavy analytics. */
  timeoutMs?: number;
}

export interface DevKitSessionToken {
  token: string;
  expiresAt: string;
  email?: string;
}

export type DevKitAuthResponse =
  | { success: true; session: DevKitSessionToken; requestId?: string }
  | { success: false; error: string; code: 'INVALID_PASSWORD' | 'CONFIG_MISSING'; requestId?: string };

interface AdminEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  code?: DevKitErrorCode | string;
  requestId?: string;
  session?: DevKitSessionToken;
}

function withDevKitTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'DevKit request timed out. Appwrite did not return a response. Check network access and Appwrite function availability.',
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function classifyMessage(message: string, status?: number): DevKitErrorCode {
  const raw = (message || '').toLowerCase();
  if (status === 401 || status === 403 || /unauthori[sz]ed|invalid devkit|expired devkit|token expired/.test(raw)) {
    return 'DEVKIT_UNAUTHORIZED';
  }
  if (/session expired|user.*session|login again|sign in again/.test(raw)) return 'APPWRITE_SESSION_EXPIRED';
  if (/function.*could not be found|not deployed|function_not_found|requested id could not be found/.test(raw)) return 'FUNCTION_NOT_FOUND';
  if (/unknown action|action is required/.test(raw)) return 'UNKNOWN_ACTION';
  if (/missing.*env|missing.*variable|not configured|config_missing|appwrite_api_key/.test(raw)) return 'MISSING_ENV';
  if (/index|attribute|collection|document.*could not be found|invalid query|schema/.test(raw)) return 'SCHEMA_OR_INDEX_ERROR';
  if (/failed to fetch|network|cannot reach|timed out|timeout/.test(raw)) return 'NETWORK_ERROR';
  if (status && status >= 500) return 'FUNCTION_RUNTIME_FAILED';
  return 'UNKNOWN';
}

function formatDevKitErrorMessage(value: unknown, fallback = 'Request failed'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value instanceof Error && value.message.trim()) return value.message.trim();
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim();
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error.trim();
    if (typeof obj.error === 'object' && obj.error !== null) {
      const nested = formatDevKitErrorMessage(obj.error, '');
      if (nested) return nested;
    }
    try {
      const json = JSON.stringify(value);
      if (json && json !== '{}') return json;
    } catch {
      // ignore
    }
  }
  if (value === null || value === undefined || value === '') return fallback;
  const coerced = String(value);
  return coerced === '[object Object]' ? fallback : coerced;
}

export function toDevKitError(input: unknown, context: { functionId?: string; action?: string } = {}): DevKitError {
  if (typeof input === 'object' && input !== null && 'code' in input && 'message' in input) {
    const err = input as Partial<DevKitError>;
    const message = formatDevKitErrorMessage(err.message, 'Unknown DevKit error');
    return {
      code: (err.code as DevKitErrorCode) ?? classifyMessage(message, err.status),
      message,
      status: err.status,
      functionId: err.functionId ?? context.functionId,
      action: err.action ?? context.action,
      requestId: err.requestId,
      raw: err.raw ?? input,
    };
  }

  const message = formatDevKitErrorMessage(input, 'Unknown DevKit error');
  const status = input instanceof Error ? (input as Error & { status?: number }).status : undefined;
  return {
    code: classifyMessage(message, status),
    message,
    status,
    functionId: context.functionId,
    action: context.action,
    raw: input,
  };
}

/**
 * Authenticates the current Appwrite session as DevKit admin.
 * The backend verifies the caller's Appwrite JWT and checks that their account
 * has the 'admin' Appwrite label — no password is required.
 */
export async function devKitLogin(): Promise<DevKitAuthResponse> {
  const result = await withDevKitTimeout(
    appwriteFunctions.invoke<AdminEnvelope<never>>('admin-devkit-data', {
      body: { action: 'verify-devkit-session' },
    }),
    15000,
    'DevKit login timed out. Appwrite did not answer the session request.',
  );

  if (result.error) {
    const code = classifyMessage(result.error.message, result.error.status);
    return {
      success: false,
      code: code === 'MISSING_ENV' ? 'CONFIG_MISSING' : 'INVALID_PASSWORD',
      error: result.error.message,
    };
  }

  const payload = result.data;
  if (payload?.success === false) {
    return {
      success: false,
      code: payload?.code === 'CONFIG_MISSING' ? 'CONFIG_MISSING' : 'INVALID_PASSWORD',
      error: payload?.error || 'DevKit login failed.',
      requestId: payload?.requestId,
    };
  }

  if (payload?.success && payload.session?.token && payload.session.expiresAt) {
    return { success: true, session: payload.session, requestId: payload.requestId };
  }

  if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
    return {
      success: false,
      code: 'INVALID_PASSWORD',
      error: 'admin-devkit-data returned an empty response. Check Appwrite function logs and redeploy admin-devkit-data.',
    };
  }

  return {
    success: false,
    code: payload?.code === 'CONFIG_MISSING' ? 'CONFIG_MISSING' : 'INVALID_PASSWORD',
    error: payload?.error || 'DevKit login failed.',
    requestId: payload?.requestId,
  };
}

export async function devKitCall<T = unknown>({
  action,
  payload,
  functionId = 'admin-devkit-data',
  timeoutMs = 90000,
}: DevKitCallOptions): Promise<DevKitResult<T>> {
  const body = { ...(payload ?? {}), action };
  let tuple: Awaited<ReturnType<typeof appwriteFunctions.invoke<AdminEnvelope<T>>>>;
  try {
    tuple = await withDevKitTimeout(
      appwriteFunctions.invoke<AdminEnvelope<T>>(functionId, devKitInvokeOptions(body)),
      timeoutMs,
      `${functionId} timed out while running ${action}.`,
    );
  } catch (err) {
    return {
      ok: false,
      error: toDevKitError(err, { functionId, action }),
    };
  }

  if (tuple.error) {
    return {
      ok: false,
      error: toDevKitError(
        { message: tuple.error.message, status: tuple.error.status },
        { functionId, action },
      ),
    };
  }

  const response = tuple.data;
  if (!response) {
    return {
      ok: false,
      error: {
        code: 'FUNCTION_RUNTIME_FAILED',
        message: `${functionId} returned no response body.`,
        functionId,
        action,
      },
    };
  }

  if (response.success === false) {
    const message = formatDevKitErrorMessage(
      response.error ?? response.message,
      `${functionId} reported failure.`,
    );
    return {
      ok: false,
      error: {
        code: classifyMessage(message, tuple.error?.status),
        message,
        functionId,
        action,
        requestId: response.requestId,
        raw: response,
      },
    };
  }

  return {
    ok: true,
    data: normalizeAdminPayload(response as Record<string, unknown>) as T,
    requestId: response.requestId,
  };
}

/**
 * Wraps `appwriteFunctions.invoke` with a single automatic retry for transient
 * failures: client-side timeout, network errors, and Appwrite function cold-start
 * kills. Only use this for idempotent READ operations — never for mutations.
 *
 * Returns the same `{ data, error }` tuple as `appwriteFunctions.invoke`.
 */
export async function invokeWithRetry<T = unknown>(
  fnName: string,
  options: Parameters<typeof appwriteFunctions.invoke>[1],
  retryDelayMs = 3000,
): Promise<Awaited<ReturnType<typeof appwriteFunctions.invoke<T>>>> {
  const result = await appwriteFunctions.invoke<T>(fnName, options);
  if (!result.error) return result;

  const msg = (result.error.message ?? '').toLowerCase();
  const isTransient =
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('runtime failed') ||
    (result.error.status !== undefined && result.error.status >= 500);

  if (!isTransient) return result;

  await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  return appwriteFunctions.invoke<T>(fnName, options);
}

export async function devKitCallOrThrow<T = unknown>(options: DevKitCallOptions): Promise<T> {
  const result = await devKitCall<T>(options);
  if (!result.ok) {
    const err = new Error(result.error.message) as Error & { devKitError?: DevKitError; status?: number };
    err.devKitError = result.error;
    err.status = result.error.status;
    throw err;
  }
  return result.data;
}
