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
            result.text.includes('Unauthorized') ||
            result.text.includes('Missing authorization') ||
            result.text.includes('invalid signature') ||
            result.text.includes('jwt');
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
          return {
            data: null,
            error: { message: `Edge function returned ${result.response.status}: ${result.text}`, status: result.response.status },
          };
        }

        return { data: result.data, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: null, error: { message } };
      }
    },
  },
};
