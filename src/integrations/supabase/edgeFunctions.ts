import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
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
 * Uses the Supabase bridge token for Authorization.
 * Automatically retries once on 401 after refreshing the bridge token.
 */
export const edgeFunctions = {
  functions: {
    invoke: async (
      fnName: string,
      options?: { body?: unknown; headers?: Record<string, string>; method?: string }
    ) => {
      const doInvoke = async (token: string | null) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': EDGE_FUNCTIONS_ANON_KEY,
          ...(options?.headers || {}),
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          headers['Authorization'] = `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`;
        }

        const url = `${EDGE_FUNCTIONS_URL}/functions/v1/${fnName}`;

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
