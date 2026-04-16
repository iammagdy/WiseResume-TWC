import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { dispatchSessionExpiredOnce } from './sessionExpired';

/**
 * Returns true when a 401 response body indicates a non-authentication reason
 * (e.g. an invalid AI API key), meaning the 401 should NOT trigger token
 * refresh or a "Session expired" user message.
 */
function isNonAuth401(status: number, text: string): boolean {
  if (status !== 401 || !text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('invalid_key') ||
    lower.includes('invalid api key') ||
    lower.includes('no ai api key') ||
    lower.includes('api key not configured')
  );
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

        // On 401, try refreshing the bridge token once and retry.
        // Primary signal: HTTP 401 status code. String matching is a secondary
        // guard only — used to exclude the rare case where an edge function
        // returns 401 for a non-auth reason (e.g. invalid AI key).
        if (result.response.status === 401 && !isNonAuth401(result.response.status, result.text)) {
          const refreshed = await refreshTokenIfNeeded();
          if (refreshed) {
            result = await doInvoke(getToken());
          } else {
            dispatchSessionExpiredOnce();
          }
        }

        if (!result.response.ok) {
          // Parse the error body for a cleaner message when possible
          let errorMessage = 'AI is temporarily unavailable — please try again in a moment.';
          try {
            const parsed = JSON.parse(result.text);
            // Prefer `message` over `error` when `error` is a short code (e.g. "invalid_key")
            // and a human-readable `message` is also present.
            const rawError = parsed?.error;
            const detail = (typeof rawError === 'string' && typeof parsed?.message === 'string' && rawError.length <= 40)
              ? parsed.message
              : (rawError || parsed?.message || parsed?.detail);
            const status = result.response.status;
            // For 401: only show "Session expired" when the response does not
            // indicate a non-auth reason (e.g. invalid AI key). This mirrors the
            // same classification used for the retry logic above.
            if ((status === 401 || status === 403) && !isNonAuth401(status, result.text)) {
              errorMessage = 'Session expired — please sign in again.';
            } else if (status === 429) {
              errorMessage = 'Too many requests — please wait a moment and try again.';
            } else if (status === 402) {
              errorMessage = 'AI credits exhausted. Please check your account.';
            } else if (detail && typeof detail === 'string') {
              if (detail.includes('No AI API key') || detail.includes('API key not configured')) {
                errorMessage = 'WiseResume AI is not configured. Please contact support or add your own API key in Settings.';
              } else if (detail.includes('invalid_key') || detail.includes('Invalid API key')) {
                errorMessage = 'Invalid API key — please check your AI settings.';
              } else if (detail.includes('rate_limit') || detail.includes('rate limit')) {
                errorMessage = 'Too many requests — please wait a moment and try again.';
              } else if (/not configured|please contact support/i.test(detail)) {
                errorMessage = 'WiseResume AI is not configured — go to Settings → AI Provider to add your API key.';
              } else if (/something went wrong/i.test(detail)) {
                errorMessage = 'AI request failed — check your AI settings or try again later.';
              } else if (detail.length < 120 && !detail.match(/^\d+$/) && !detail.toLowerCase().includes('error code') && !detail.toLowerCase().includes('function')) {
                // Only use the detail if it looks like a user-readable message
                errorMessage = detail;
              }
            }
          } catch {
            // Use status-based message if body isn't valid JSON
            const status = result.response.status;
            if ((status === 401 || status === 403) && !isNonAuth401(status, result.text)) {
              errorMessage = 'Session expired — please sign in again.';
            } else if (status === 429) {
              errorMessage = 'Too many requests — please wait a moment and try again.';
            } else if (status === 402) {
              errorMessage = 'AI credits exhausted. Please check your account.';
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
