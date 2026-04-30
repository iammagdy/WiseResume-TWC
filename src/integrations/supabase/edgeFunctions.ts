import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { getImpersonationToken } from '@/lib/impersonationStore';
import { dispatchSessionExpiredOnce } from './sessionExpired';
import { parseAIErrorBody, aiErrorToastMessage, type AIErrorCode } from '@/lib/aiErrorParser';
import { apiFnUrl } from '@/lib/apiFnUrl';
import { EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';

/**
 * Classify an edge-function error response. Prefers the structured `error`
 * code in the JSON body; falls back to the parser's status/text heuristics
 * only when no code is present. Returns the typed code plus a user-ready
 * toast string and a flag for whether this was a true session-auth failure
 * (i.e. should trigger a token refresh / "session expired" dispatch).
 */
function classifyEdgeError(status: number, text: string): {
  code: AIErrorCode;
  message: string;
  isSessionAuthFailure: boolean;
} {
  let bodyJson: unknown = null;
  try {
    bodyJson = JSON.parse(text);
  } catch {
    // Fall through with null; parseAIErrorBody handles the missing-body case.
  }
  const info = parseAIErrorBody(bodyJson ?? { message: text }, status);
  // A 401/403 is a real session-auth failure only when the structured code
  // resolves to `unauthorized` — invalid_key / not_configured 401s from
  // BYOK providers must not refresh tokens or surface "Session expired".
  const isSessionAuthFailure =
    (status === 401 || status === 403) && info.code === 'unauthorized';
  return {
    code: info.code,
    message: aiErrorToastMessage(info),
    isSessionAuthFailure,
  };
}

/**
 * DevKit-only edge functions whose name does NOT start with `admin-` and
 * which therefore would otherwise be misclassified by the AI error parser.
 * Listing them here makes their 401/non-2xx responses surface the raw
 * `error` string from the function body instead of the misleading
 * "Session expired — please sign in again to use AI features." toast.
 *
 * `ai-test` (Bug #5): the DevKit AI key smoke-test endpoint. Its 401s are
 * either function-level `Unauthorized` (DevKit token bad) or platform
 * gateway errors (verify_jwt drift). Either way the user shouldn't be
 * told their session expired.
 */
const DEVKIT_BYPASS_FUNCTIONS: ReadonlySet<string> = new Set(['ai-test']);

/**
 * Authenticated edge function client.
 * Routes via apiFnUrl(): in dev, through the Express proxy at
 * /api/fn/:fnName; in production (Hostinger static), directly to the
 * Supabase Edge Function at ${VITE_SUPABASE_URL}/functions/v1/:fnName
 * (Phase 8 contract — see
 * Project Atlas/01-Currently Implemented/stability-fixes/
 * phase-8-prod-edge-function-routing.md).
 * Automatically retries once on 401 after refreshing the bridge token.
 */
export const edgeFunctions = {
  functions: {
    invoke: async (
      fnName: string,
      options?: { body?: unknown; headers?: Record<string, string>; method?: string }
    ) => {
      const doInvoke = async (token: string | null) => {
        const userHeaders = options?.headers || {};
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...userHeaders,
        };

        // Caller-supplied Authorization wins over the bridge token. Admin
        // (DevKit) calls use this to send the HMAC-signed session token in
        // the Authorization header instead of the user's Supabase JWT.
        const hasUserAuth =
          'Authorization' in userHeaders || 'authorization' in userHeaders;
        if (token && !hasUserAuth) {
          headers['Authorization'] = `Bearer ${token}`;
        } else if (!token && !hasUserAuth && EDGE_FUNCTIONS_ANON_KEY) {
          // No user session — send the anon key so the Supabase gateway
          // accepts the request. verify_jwt=false skips JWT verification but
          // the gateway still requires some form of auth header; without it
          // every unauthenticated call (e.g. bootstrap wizard, public
          // endpoints) returns 401 "Missing authorization header".
          headers['Authorization'] = `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`;
          headers['apikey'] = EDGE_FUNCTIONS_ANON_KEY;
        }
        // Defence-in-depth (Bug #5): always attach the anon `apikey` header
        // when we have it, even if the caller already supplied an
        // Authorization header (e.g. DevKit's HMAC bearer). The Supabase
        // gateway uses `apikey` as its platform credential anchor; if a
        // function ever drifts to verify_jwt=true at the gateway layer,
        // having a valid apikey alongside lets the request still reach the
        // function code instead of being rejected with the misleading
        // "Invalid or expired auth token" gateway error.
        if (EDGE_FUNCTIONS_ANON_KEY && !('apikey' in headers)) {
          headers['apikey'] = EDGE_FUNCTIONS_ANON_KEY;
        }

        const url = apiFnUrl(fnName);

        const response = await fetch(url, {
          method: options?.method || 'POST',
          headers,
          body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        });

        const text = await response.text();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any = null; // Edge function responses are dynamic JSON; typed at call sites
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        return { response, data, text };
      };

      try {
        // Prefer the impersonation token when active (user-facing feature calls
        // should run as the impersonated user). Caller-supplied Authorization
        // headers (e.g. DevKit admin calls via devKitAuthHeaders) take priority
        // inside doInvoke, so admin ops are unaffected.
        const effectiveToken = getImpersonationToken() ?? getToken();
        let result = await doInvoke(effectiveToken);

        // On 401: only refresh + retry when the structured classification
        // says this is a true session-auth failure. A BYOK 401
        // (invalid_key / not_configured) must NOT consume a refresh.
        // Skip refresh entirely when impersonating — the impersonation token
        // cannot be refreshed via the standard bridge.
        // Skip refresh + session-expired dispatch entirely for admin/DevKit
        // functions (Bug #5): they authenticate with the HMAC DevKit token,
        // not the user's Supabase JWT, so refreshing the bridge token would
        // be useless and the "session expired" dispatch would surface the
        // misleading toast we explicitly guard against in the bypass branch
        // below.
        const isAdminOrDevkitFn =
          fnName.startsWith('admin-') || DEVKIT_BYPASS_FUNCTIONS.has(fnName);
        if (result.response.status === 401 && !isAdminOrDevkitFn) {
          const { isSessionAuthFailure } = classifyEdgeError(401, result.text);
          if (isSessionAuthFailure && !getImpersonationToken()) {
            const refreshed = await refreshTokenIfNeeded();
            if (refreshed) {
              result = await doInvoke(getToken());
            } else {
              dispatchSessionExpiredOnce();
            }
          }
        }

        if (!result.response.ok) {
          // Admin/DevKit functions have nothing to do with AI — bypass the AI
          // error parser entirely and surface the raw `error` field from the
          // response body (or an HTTP-status fallback). This prevents
          // validation errors (e.g. { success:false, error:"...", status:"invalid" })
          // from being misread by parseAIErrorBody and turned into misleading
          // "AI is temporarily unavailable" messages. Functions covered:
          // every `admin-*` function plus the DEVKIT_BYPASS_FUNCTIONS set
          // (module-level constant, currently `ai-test` for Bug #5).
          if (fnName.startsWith('admin-') || DEVKIT_BYPASS_FUNCTIONS.has(fnName)) {
            let rawError: string | null = null;
            try {
              const parsed = JSON.parse(result.text);
              if (typeof parsed?.error === 'string') rawError = parsed.error;
              else if (typeof parsed?.message === 'string') rawError = parsed.message;
            } catch {
              // fall through
            }
            const finalMessage = rawError ?? `Server error (HTTP ${result.response.status}) — please try again.`;
            return {
              data: null,
              error: { message: finalMessage, status: result.response.status },
            };
          }
          const { code, message } = classifyEdgeError(result.response.status, result.text);
          return {
            data: null,
            error: { message, code, status: result.response.status },
          };
        }

        return { data: result.data, error: null };
      } catch (err) {
        // A TypeError "Failed to fetch" means the network request itself couldn't complete
        const rawMessage = err instanceof Error ? err.message : String(err);
        const message = rawMessage === 'Failed to fetch'
          ? 'Cannot reach the server. Check your internet connection and try again.'
          : rawMessage;
        return { data: null, error: { message } };
      }
    },
  },
};
