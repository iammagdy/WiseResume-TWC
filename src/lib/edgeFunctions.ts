/**
 * Edge Functions client — multipart/FormData-capable wrapper.
 *
 * Routes all edge function calls through Appwrite Functions via the
 * proxy at /api/fn/:fnName so API keys never leave the server.
 *
 * Authorization uses an Appwrite JWT (replaces the legacy Supabase bridge
 * token). A single in-flight JWT is shared and cached for 14 minutes.
 */
import { getAppwriteJWT, invalidateAppwriteJWT } from '@/lib/appwriteJWT';
import { dispatchSessionExpiredOnce } from '@/integrations/supabase/sessionExpired';
import { apiFnUrl } from '@/lib/apiFnUrl';

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

  const userHeaders = options?.headers ?? {};
  const headers: Record<string, string> = { ...userHeaders };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const hasUserAuth =
    'Authorization' in userHeaders || 'authorization' in userHeaders;
  if (token && !hasUserAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = apiFnUrl(fnName);

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
      let token = await getAppwriteJWT();
      let response = await doFetch(fnName, options, token);

      if (response.status === 401) {
        invalidateAppwriteJWT();
        token = await getAppwriteJWT();
        if (token) {
          response = await doFetch(fnName, options, token);
        } else {
          dispatchSessionExpiredOnce();
          return {
            data: null,
            error: { message: 'Session expired — please sign in again.', status: 401 },
          };
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

  functions: {
    async invoke<T = unknown>(
      fnName: string,
      options?: InvokeOptions,
    ): Promise<InvokeResult<T>> {
      return edgeFunctions.invoke<T>(fnName, options);
    },
  },
};
