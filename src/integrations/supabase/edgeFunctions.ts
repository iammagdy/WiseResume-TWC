import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';

/**
 * Authenticated edge function client pointing at jnsfmkzgxsviuthaqlyy.
 *
 * Uses a raw fetch so we have full control over the Authorization header.
 * Supabase's built-in client.functions.invoke() overrides auth headers
 * with its own session token, which breaks Clerk-based auth.
 */

async function getTokenWithRetry(retries = 5, delayMs = 500): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    const token = await getClerkSupabaseToken();
    if (token) return token;
    if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

export const edgeFunctions = {
  functions: {
    invoke: async (
      fnName: string,
      options?: { body?: unknown; headers?: Record<string, string>; method?: string }
    ) => {
      const token = await getTokenWithRetry();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': EDGE_FUNCTIONS_ANON_KEY,
        ...(options?.headers || {}),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback: at minimum send the anon key as bearer so the function
        // receives SOME authorization header and can return a proper error
        headers['Authorization'] = `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`;
        console.warn(`[edgeFunctions] No Clerk token available for ${fnName} — using anon fallback`);
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
