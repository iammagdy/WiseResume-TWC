export type AuthErrorKind =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'network_unavailable'
  | 'service_unavailable'
  | 'unknown';

export interface ClassifiedAuthError {
  kind: AuthErrorKind;
  status?: number;
  code?: string;
  type?: string;
  requestId?: string;
}

type ErrorLike = {
  code?: unknown;
  status?: unknown;
  type?: unknown;
  message?: unknown;
  requestId?: unknown;
  response?: {
    headers?: Record<string, unknown>;
  };
};

function asRecord(value: unknown): ErrorLike {
  return typeof value === 'object' && value !== null ? value as ErrorLike : {};
}

function asString(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function asStatus(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d{3}$/.test(value)) return Number(value);
  return undefined;
}

export function classifyAuthError(input: unknown): ClassifiedAuthError {
  const error = asRecord(input);
  const status = asStatus(error.status ?? error.code);
  const code = typeof error.code === 'number' ? String(error.code) : asString(error.code);
  const type = asString(error.type);
  const message = asString(error.message, 240)?.toLowerCase() ?? '';
  const requestId = asString(
    error.requestId ?? error.response?.headers?.['x-request-id'] ?? error.response?.headers?.['x-appwrite-request-id'],
  );
  const categoryText = `${code ?? ''} ${type ?? ''} ${message}`.toLowerCase();

  if (
    status === 401 ||
    /invalid[_ -]?(credentials?|password)|user[_ -]?not[_ -]?found|unauthori[sz]ed/.test(categoryText)
  ) {
    return { kind: 'invalid_credentials', status, code, type, requestId };
  }

  if (status === 429 || /rate[_ -]?limit|too many requests|too many attempts/.test(categoryText)) {
    return { kind: 'rate_limited', status, code, type, requestId };
  }

  if (
    status === 408 ||
    status === 504 ||
    /failed to fetch|network|offline|timed? ?out|timeout|connection/.test(categoryText)
  ) {
    return { kind: 'network_unavailable', status, code, type, requestId };
  }

  if (status !== undefined && status >= 500) {
    return { kind: 'service_unavailable', status, code, type, requestId };
  }

  return { kind: 'unknown', status, code, type, requestId };
}

export function authErrorMessage(kind: AuthErrorKind): string {
  switch (kind) {
    case 'invalid_credentials':
      return 'Invalid email or password. You can reset your password if needed.';
    case 'rate_limited':
      return 'Too many sign-in attempts. Please wait and try again.';
    case 'network_unavailable':
      return 'We could not reach the sign-in service. Check your connection and try again.';
    case 'service_unavailable':
      return 'The sign-in service is temporarily unavailable. Please try again.';
    case 'unknown':
    default:
      return 'Sign-in is temporarily unavailable. Please try again later.';
  }
}
