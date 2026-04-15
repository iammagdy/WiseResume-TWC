/**
 * Edge Functions client — multipart/FormData-capable wrapper.
 *
 * Used by hooks that need to send file uploads to Supabase Edge Functions
 * (e.g. wisehire-bulk-screen). Unlike the JSON-only client in
 * src/integrations/supabase/edgeFunctions.ts, this one does NOT set
 * Content-Type so the browser can set the correct multipart boundary.
 */
import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { dispatchSessionExpiredOnce } from '@/integrations/supabase/sessionExpired';

interface InvokeOptions {
  body?: FormData | Record<string, unknown> | unknown;
  headers?: Record<string, string>;
  method?: string;
}

interface InvokeResult<T> {
  data: T | null;
  error: { message: string; status?: number } | null;
}

async function doFetch(
  fnName: string,
  options: InvokeOptions | undefined,
  token: string | null,
): Promise<Response> {
  const isFormData = options?.body instanceof FormData;

  const headers: Record<string, string> = {
    'apikey': EDGE_FUNCTIONS_ANON_KEY,
    ...(options?.headers ?? {}),
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['Authorization'] = `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`;
  }

  const url = `${EDGE_FUNCTIONS_URL}/functions/v1/${fnName}`;

  return fetch(url, {
    method: options?.method ?? 'POST',
    headers,
    body: isFormData
      ? (options!.body as FormData)
      : options?.body !== undefined
      ? JSON.stringify(options.body)
      : undefined,
  });
}

export const edgeFunctions = {
  async invoke<T = unknown>(
    fnName: string,
    options?: InvokeOptions,
  ): Promise<InvokeResult<T>> {
    try {
      let response = await doFetch(fnName, options, getToken());

      if (response.status === 401) {
        const refreshed = await refreshTokenIfNeeded();
        if (refreshed) {
          response = await doFetch(fnName, options, getToken());
        } else {
          dispatchSessionExpiredOnce();
          return { data: null, error: { message: 'Session expired — please sign in again.', status: 401 } };
        }
      }

      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      if (!response.ok) {
        let message = 'An error occurred. Please try again.';
        if (response.status === 429) message = 'Too many requests — please wait a moment and try again.';
        else if (response.status === 402) message = 'AI credits exhausted. Please check your account.';
        else if (response.status === 401 || response.status === 403) message = 'Session expired — please sign in again.';
        else if (typeof parsed === 'object' && parsed !== null) {
          const err = parsed as Record<string, unknown>;
          if (typeof err.error === 'string') message = err.error;
          else if (typeof err.message === 'string') message = err.message;
        }
        return { data: null, error: { message, status: response.status } };
      }

      return { data: parsed as T, error: null };
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const message =
        rawMessage === 'Failed to fetch'
          ? 'Cannot reach the server. Check your internet connection and try again.'
          : rawMessage;
      return { data: null, error: { message } };
    }
  },
};
