import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { dispatchSessionExpiredOnce } from './sessionExpired';

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
        let data: unknown = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }

        return { response, data, text };
      };

      try {
        let result = await doInvoke(getToken());

        // On 401, try refreshing the bridge token once and retry.
        // Guard: only treat it as an auth error if the response body looks like one —
        // some edge functions return 401 for non-auth reasons (e.g. invalid AI key).
        if (result.response.status === 401) {
          const looksLikeAuthError =
            !result.text ||
            result.text.toLowerCase().includes('unauthorized') ||
            result.text.includes('Missing authorization') ||
            result.text.includes('Missing sub claim') ||
            result.text.includes('invalid signature') ||
            result.text.includes('jwt') ||
            result.text.includes('session') ||
            result.text.includes('token');
          if (looksLikeAuthError) {
            const refreshed = await refreshTokenIfNeeded();
            if (refreshed) {
              result = await doInvoke(getToken());
            } else {
              dispatchSessionExpiredOnce();
            }
          }
        }

        if (!result.response.ok) {
          // Parse the error body for a cleaner message when possible
          let errorMessage = `Edge function returned ${result.response.status}: ${result.text}`;
          try {
            const parsed = JSON.parse(result.text);
            const detail = parsed?.error || parsed?.message || parsed?.detail;
            if (detail && typeof detail === 'string') {
              if (result.response.status === 401 || result.response.status === 403) {
                errorMessage = `Session expired — please sign in again`;
              } else if (result.response.status === 429) {
                errorMessage = parsed?.message || 'Rate limit reached. Please wait a moment.';
              } else if (detail.includes('No AI API key') || detail.includes('API key not configured')) {
                errorMessage = 'WiseResume AI is not configured on the server. Please contact support or use your own API key in Settings.';
              } else {
                errorMessage = detail;
              }
            }
          } catch {
            // Use the default message if body isn't valid JSON
            if (result.response.status === 401 || result.response.status === 403) {
              errorMessage = 'Session expired — please sign in again';
            }
          }
          return {
            data: null,
            error: { message: errorMessage, status: result.response.status },
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
