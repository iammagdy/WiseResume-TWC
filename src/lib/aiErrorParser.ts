/**
 * Centralized parser for AI edge-function error responses.
 *
 * Edge functions (notably enhance-section, tailor-resume, etc.) consistently
 * return JSON shaped as:
 *   { error: '<code>', message: '<human readable>' }
 * where `<code>` matches the AIError types emitted by `_shared/aiClient.ts`
 * (rate_limit, payment_required, invalid_key, quota_exceeded, unauthorized,
 *  enhancement_failed, provider_busy, internal, ...).
 *
 * Before this helper existed, every hook/component re-implemented the same
 * status-code + regex matching logic, which drifted (some looked at status,
 * some at message text, and the 401 path was disambiguated by string match
 * on "unauthorized" / "jwt expired" rather than the structured code).
 *
 * Use `parseAIErrorResponse(res)` to convert a non-OK Response into a typed
 * `AIErrorInfo`, then `aiErrorToastMessage(info)` to produce the user-facing
 * toast string. Throw an Error tagged with `info.code` so callers can branch
 * on the code without re-parsing the message.
 */

export type AIErrorCode =
  | 'unauthorized'
  | 'rate_limit'
  | 'payment_required'
  | 'invalid_key'
  | 'quota_exceeded'
  | 'enhancement_failed'
  | 'provider_busy'
  | 'not_configured'
  | 'timeout'
  | 'offline'
  | 'internal';

export interface AIErrorInfo {
  code: AIErrorCode;
  message: string;
  status: number;
}

/**
 * Tagged Error so downstream `catch` blocks can read `error.code` directly
 * without re-parsing the message.
 */
export class AIError extends Error {
  code: AIErrorCode;
  status: number;
  constructor(info: AIErrorInfo) {
    super(info.message);
    this.name = 'AIError';
    this.code = info.code;
    this.status = info.status;
  }
}

export function isAIError(err: unknown): err is AIError {
  return err instanceof Error && 'code' in err && typeof (err as AIError).code === 'string';
}

/**
 * Map a structured `error` code returned by the edge function to our local
 * `AIErrorCode`. Falls back to status-code based classification when the
 * code is missing or unknown, then to a regex sniff on the message text.
 */
function classify(status: number, code: string, message: string): AIErrorCode {
  // 1) Trust the structured code first when present
  switch (code) {
    case 'unauthorized':
      return 'unauthorized';
    case 'rate_limit':
      return 'rate_limit';
    case 'payment_required':
      return 'payment_required';
    case 'invalid_key':
      return 'invalid_key';
    case 'quota_exceeded':
      return 'quota_exceeded';
    case 'enhancement_failed':
      return 'enhancement_failed';
    case 'provider_busy':
      return 'provider_busy';
    case 'not_configured':
      return 'not_configured';
  }

  // 2) Message-text classification BEFORE status-based fallback. A 401 from a
  // BYOK edge function with body "invalid_key"/"Invalid API key"/"not
  // configured" must surface as the more-specific code, not a generic
  // "Session expired" message. Order matters here.
  const m = (message || code || '').toLowerCase();
  if (/invalid.?key|invalid api key|no ai api key/.test(m)) return 'invalid_key';
  if (/api key not configured|not configured|please contact support/.test(m)) return 'not_configured';
  if (/quota.*exceed|daily.*quota/.test(m)) return 'quota_exceeded';

  // 3) Status-code based fallback (legacy responses with no code or text)
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate_limit';
  if (status === 402) return 'payment_required';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 503) return 'provider_busy';

  if (/rate.?limit|too many/.test(m)) return 'rate_limit';
  if (/timed? ?out|timeout|abort/.test(m)) return 'timeout';

  return 'internal';
}

/**
 * Parse a non-OK fetch Response from an edge function into a typed AIErrorInfo.
 * Safe to call after `if (!res.ok) ...` — never throws.
 */
export async function parseAIErrorResponse(res: Response): Promise<AIErrorInfo> {
  let body: Record<string, unknown> = {};
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  const codeRaw = typeof body.error === 'string' ? body.error : '';
  const message = typeof body.message === 'string' ? body.message : '';
  const code = classify(res.status, codeRaw, message);
  return { code, status: res.status, message: message || codeRaw || res.statusText };
}

/**
 * Same as `parseAIErrorResponse` but for an inline JSON body (success-shaped
 * response that contains an `error` field — some legacy paths still do this).
 */
export function parseAIErrorBody(body: unknown, fallbackStatus = 500): AIErrorInfo {
  const obj = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};
  const codeRaw = typeof obj.error === 'string' ? obj.error : '';
  const message = typeof obj.message === 'string' ? obj.message : '';
  const code = classify(fallbackStatus, codeRaw, message);
  return { code, status: fallbackStatus, message: message || codeRaw || 'Unknown error' };
}

/**
 * Translate an AIErrorInfo into the toast string we want to show the user.
 * Keep these messages stable — they have been refined based on user feedback.
 */
export function aiErrorToastMessage(info: AIErrorInfo): string {
  switch (info.code) {
    case 'unauthorized':
      return 'Session expired — please sign in again to use AI features.';
    case 'rate_limit':
      return 'Too many requests — please wait a moment and try again.';
    case 'payment_required':
      return 'AI credits exhausted. Please check your account.';
    case 'invalid_key':
      return info.message && /invalid/i.test(info.message)
        ? info.message
        : 'Invalid API key — please check your AI settings.';
    case 'quota_exceeded':
      return 'AI daily quota exceeded. Try again tomorrow or add your own API key in Settings.';
    case 'not_configured':
      return 'WiseResume AI is not configured — go to Settings → AI Provider to add your API key.';
    case 'enhancement_failed':
      return 'Failed to enhance content — please try again.';
    case 'provider_busy':
      return 'AI is temporarily busy — please try again in a moment.';
    case 'timeout':
      return 'The AI request timed out. Please try again.';
    case 'offline':
      return "You're offline — AI features need an internet connection. Your resume content is safe.";
    case 'internal':
    default:
      return 'AI is temporarily unavailable — please try again in a moment.';
  }
}

/**
 * Convenience: parse + throw a typed AIError so the caller's catch can read
 * `error.code` directly. Use as:
 *     if (!res.ok) await throwAIError(res);
 */
export async function throwAIError(res: Response): Promise<never> {
  const info = await parseAIErrorResponse(res);
  throw new AIError(info);
}
