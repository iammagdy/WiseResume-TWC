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
 * Coupons consolidation (Task #48).
 *
 * Routes the three legacy coupon function names to the merged `coupons`
 * router. Dispatch is signalled via the `x-coupons-action` header so the
 * request body is forwarded byte-for-byte (no key remapping) and each
 * handler in the merged router preserves its original parse-vs-auth
 * order. Set USE_MERGED_COUPONS=false to fall back to the original
 * endpoints if they are still deployed.
 */
const USE_MERGED_COUPONS = true;
const COUPON_FN_ACTIONS: Record<string, 'admin-manage' | 'redeem' | 'validate'> = {
  'admin-manage-coupons': 'admin-manage',
  'redeem-coupon': 'redeem',
  'validate-coupon': 'validate',
};
function rewriteCouponInvoke(
  fnName: string,
  options: { body?: unknown; headers?: Record<string, string>; method?: string } | undefined,
): { fnName: string; options: { body?: unknown; headers?: Record<string, string>; method?: string } | undefined } {
  if (!USE_MERGED_COUPONS) return { fnName, options };
  const action = COUPON_FN_ACTIONS[fnName];
  if (!action) return { fnName, options };
  const newHeaders: Record<string, string> = { ...(options?.headers ?? {}), 'x-coupons-action': action };
  return { fnName: 'coupons', options: { ...(options ?? {}), headers: newHeaders } };
}

/**
 * Admin user-lifecycle consolidation (Task #51).
 *
 * Routes the seven legacy admin user-lifecycle function names to the
 * merged `admin-user-ops` router. Dispatch is signalled via the
 * `x-admin-user-op` request header so the router never has to read
 * the request body — that's what lets each handler in the merged
 * router preserve its ORIGINAL parse-vs-auth ordering byte-for-byte
 * (critical for malformed-body parity, especially for
 * admin-revoke-sessions which originally swallowed parse errors into
 * `body = {}` and returned 400, while the other 6 originals threw to
 * outer try/catch and returned 500).
 *
 * For spec compliance the helper ALSO injects `body.action` set to
 * the same value; the router doesn't read it but it's there for
 * any caller / observability tool that inspects the body.
 *
 * Set USE_MERGED_ADMIN_USER_OPS=false to fall back to the seven
 * originals while soaking the new router.
 *
 * Explicitly excluded (kept isolated): admin-delete-user.
 */
const USE_MERGED_ADMIN_USER_OPS = true;
const ADMIN_USER_OPS_ACTIONS: Record<
  string,
  'suspend' | 'grant-trial' | 'revoke-trial' | 'set-credits' | 'set-plan' | 'revoke-sessions' | 'update-profile'
> = {
  'admin-suspend-user': 'suspend',
  'admin-grant-trial': 'grant-trial',
  'admin-revoke-trial': 'revoke-trial',
  'admin-set-credits': 'set-credits',
  'admin-set-plan': 'set-plan',
  'admin-revoke-sessions': 'revoke-sessions',
  'admin-update-profile': 'update-profile',
};
function rewriteAdminUserOpsInvoke(
  fnName: string,
  options: { body?: unknown; headers?: Record<string, string>; method?: string } | undefined,
): { fnName: string; options: { body?: unknown; headers?: Record<string, string>; method?: string } | undefined } {
  if (!USE_MERGED_ADMIN_USER_OPS) return { fnName, options };
  const action = ADMIN_USER_OPS_ACTIONS[fnName];
  if (!action) return { fnName, options };
  const newHeaders: Record<string, string> = {
    ...(options?.headers ?? {}),
    'x-admin-user-op': action,
  };
  // Preserve the original body 1:1 so each handler sees exactly what
  // its pre-merge function saw (incl. admin-update-profile's inner
  // `body.action: 'get'` selector). Add a top-level `action` field
  // alongside (spec compliance) without clobbering an existing one.
  const origBody = options?.body;
  let newBody: unknown = origBody;
  if (origBody && typeof origBody === 'object' && !Array.isArray(origBody)) {
    const obj = origBody as Record<string, unknown>;
    if (!('action' in obj)) {
      newBody = { ...obj, action };
    }
    // If body already has its own `action` field (e.g. update-profile
    // GET path), leave it untouched — the router dispatches on the
    // header, not the body, so there's no collision.
  } else if (origBody === undefined) {
    newBody = { action };
  }
  return {
    fnName: 'admin-user-ops',
    options: { ...(options ?? {}), headers: newHeaders, body: newBody },
  };
}

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
      fnNameInput: string,
      options?: { body?: unknown; headers?: Record<string, string>; method?: string }
    ) => {
      // Rewrite legacy coupon fn names to the merged `coupons` router
      // when the USE_MERGED_COUPONS flag is on. Dispatch happens via the
      // x-coupons-action header so the request body is left unmodified.
      const originalFnName = fnNameInput;
      const couponRewritten = rewriteCouponInvoke(fnNameInput, options);
      const adminRewritten = rewriteAdminUserOpsInvoke(couponRewritten.fnName, couponRewritten.options);
      const fnName = adminRewritten.fnName;
      options = adminRewritten.options;
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
          fnName.startsWith('admin-') ||
          DEVKIT_BYPASS_FUNCTIONS.has(fnName) ||
          originalFnName.startsWith('admin-');
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
          if (fnName.startsWith('admin-') || DEVKIT_BYPASS_FUNCTIONS.has(fnName) || originalFnName.startsWith('admin-')) {
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
