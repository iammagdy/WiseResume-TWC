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
  | 'upstream_5xx'
  | 'not_configured'
  | 'invalid_ai_response'
  | 'entries_dropped'
  | 'profile_incomplete'
  | 'timeout'
  | 'offline'
  | 'byok_failed'
  | 'free_limit_reached'
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
    case 'upstream_5xx':
      return 'upstream_5xx';
    case 'not_configured':
      return 'not_configured';
    case 'invalid_ai_response':
      return 'invalid_ai_response';
    case 'entries_dropped':
      return 'entries_dropped';
    case 'profile_incomplete':
      return 'profile_incomplete';
    case 'insufficient_credits':
      return 'payment_required';
    case 'invalid_api_key':
      return 'invalid_key';
    case 'provider_unavailable':
      return 'provider_busy';
    case 'byok_failed':
      return 'byok_failed';
    case 'free_limit_reached':
      return 'free_limit_reached';
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
  // Catch-all upstream provider failure (500/502/520/etc). Differentiated
  // from `provider_busy` (503) so the toast can specifically tell the user
  // the upstream is glitching rather than rate-limiting them.
  if (status >= 500 && status < 600) return 'upstream_5xx';

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
  // Edge functions split on which key carries the structured code: prefer
  // explicit `code` / `error_code` over the human-readable `error` string
  // so classify() routes on the canonical code first.
  const codeRaw =
    (typeof body.code === 'string' && body.code) ||
    (typeof body.error_code === 'string' && body.error_code) ||
    (typeof body.error === 'string' && body.error) ||
    '';
  const message =
    typeof body.message === 'string'
      ? body.message
      : typeof body.error === 'string'
        ? body.error
        : '';
  const code = classify(res.status, codeRaw, message);
  return { code, status: res.status, message: message || codeRaw || res.statusText };
}

/**
 * Same as `parseAIErrorResponse` but for an inline JSON body (success-shaped
 * response that contains an `error` field — some legacy paths still do this).
 */
export function parseAIErrorBody(body: unknown, fallbackStatus = 500): AIErrorInfo {
  const obj = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};
  // Edge functions are inconsistent about which key carries the structured
  // code: `error` (legacy), `code` (current), `error_code` (a couple of
  // older paths). Prefer the explicit code keys over the human-readable
  // `error` string so classify() can route on the canonical code first.
  const codeRaw =
    (typeof obj.code === 'string' && obj.code) ||
    (typeof obj.error_code === 'string' && obj.error_code) ||
    (typeof obj.error === 'string' && obj.error) ||
    '';
  const message =
    typeof obj.message === 'string'
      ? obj.message
      : typeof obj.error === 'string'
        ? obj.error
        : '';
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
      return 'AI service authentication failed — please try again in a moment or contact support if this persists.';
    case 'quota_exceeded':
      return 'AI daily quota exceeded. Please try again tomorrow.';
    case 'not_configured':
      return 'AI service is temporarily unavailable — please try again in a moment or contact support.';
    case 'enhancement_failed':
      return 'Failed to enhance content — please try again.';
    case 'provider_busy':
      return 'AI is temporarily busy — please try again in a moment.';
    case 'invalid_ai_response':
      // Server-side schema validation rejected the AI's reply. The credit
      // is already refunded, so we explicitly tell the user not to retry
      // the exact same request — a different prompt or section is more
      // likely to succeed.
      return 'AI returned an invalid response. Your credit was refunded — please try a different section or rephrase your request.';
    case 'entries_dropped':
      // Server's output-quality validator caught the AI dropping entries
      // even after one re-prompt. The credit is already refunded server-side
      // and the user's original entries remain untouched.
      return info.message ||
        'AI returned fewer entries than you sent. Your credit was refunded and nothing was changed — please try again.';
    case 'profile_incomplete':
      return 'Your profile is incomplete. Please finish setting up your profile before using AI features.';
    case 'upstream_5xx':
      return 'The AI provider returned an error. Please try again in a moment — if it keeps failing, contact support.';
    case 'byok_failed':
      return info.message
        ? `Your API key failed: ${info.message}`
        : 'Your API key returned an error — check key validity in AI Engine settings or switch back to WiseResume Pool.';
    case 'free_limit_reached':
      return 'Daily AI limit reached. Upgrade your plan or add your own API key in AI Engine settings.';
    case 'timeout':
      return 'The AI request timed out. Please try again.';
    case 'offline':
      return "You're offline — AI features need an internet connection. Your resume content is safe.";
    case 'internal':
    default:
      // AI-5: never surface the server diagnostic string ("Something went
      // wrong: <ErrorClass>: <msg>") in the toast. The diag is scrubbed
      // for secrets server-side but UX-wise still looks like a stack
      // trace. Callers that want the diag for debugging should read
      // `info.message` directly and log to console; the toast string
      // returned here is always the friendly mapped copy.
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
