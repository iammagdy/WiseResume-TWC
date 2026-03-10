import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { getToken } from '@/lib/supabaseBridge';

/**
 * Authenticated edge function client.
 * Uses the Supabase bridge token for Authorization.
 */
export const edgeFunctions = {
  functions: {
    invoke: async (
      fnName: string,
      options?: { body?: unknown; headers?: Record<string, string>; method?: string }
    ) => {
      const bridgeToken = getToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': EDGE_FUNCTIONS_ANON_KEY,
        ...(options?.headers || {}),
      };

      if (bridgeToken) {
        headers['Authorization'] = `Bearer ${bridgeToken}`;
      } else {
        headers['Authorization'] = `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`;
        console.warn(`[edgeFunctions] No bridge token available for ${fnName} — using anon fallback`);
      }

      const url = `${EDGE_FUNCTIONS_URL}/functions/v1/${fnName}`;

      try {
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

        if (!response.ok) {
          return {
            data: null,
            error: { message: `Edge function returned ${response.status}: ${text}`, status: response.status },
          };
        }

        return { data, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { data: null, error: { message } };
      }
    },
  },
};
