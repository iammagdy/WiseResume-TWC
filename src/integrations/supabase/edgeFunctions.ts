import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { dispatchSessionExpiredOnce } from './sessionExpired';
import { parseAIErrorBody, aiErrorToastMessage, type AIErrorCode } from '@/lib/aiErrorParser';

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
 * Authenticated edge function client.
 * Routes all calls through the Express server proxy at /api/fn/:fnName
 * so that Supabase keys never leave the server.
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
        }

        const url = `/api/fn/${fnName}`;

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
        let result = await doInvoke(getToken());

        // On 401: only refresh + retry when the structured classification
        // says this is a true session-auth failure. A BYOK 401
        // (invalid_key / not_configured) must NOT consume a refresh.
        if (result.response.status === 401) {
          const { isSessionAuthFailure } = classifyEdgeError(401, result.text);
          if (isSessionAuthFailure) {
            const refreshed = await refreshTokenIfNeeded();
            if (refreshed) {
              result = await doInvoke(getToken());
            } else {
              dispatchSessionExpiredOnce();
            }
          }
        }

        if (!result.response.ok) {
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
