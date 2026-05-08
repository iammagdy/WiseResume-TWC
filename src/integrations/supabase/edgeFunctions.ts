import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { getImpersonationToken } from '@/lib/impersonationStore';
import { dispatchSessionExpiredOnce } from './sessionExpired';
import { parseAIErrorBody, aiErrorToastMessage, type AIErrorCode } from '@/lib/aiErrorParser';
import { apiFnUrl } from '@/lib/apiFnUrl';
import { EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { shouldRouteToAppwrite, invokeAppwriteHub } from '@/lib/appwrite-bridge';

function classifyEdgeError(status: number, text: string) {
  let bodyJson: unknown = null;
  try { bodyJson = JSON.parse(text); } catch {}
  const info = parseAIErrorBody(bodyJson ?? { message: text }, status);
  const isSessionAuthFailure = (status === 401 || status === 403) && info.code === 'unauthorized';
  return { code: info.code, message: aiErrorToastMessage(info), isSessionAuthFailure };
}

export const edgeFunctions = {
  functions: {
    invoke: async (fnName: string, options?: any) => {
      // 1. APPWRITE BRIDGE (Phase 4)
      // Intercept and route to Appwrite Hubs if enabled for this function
      if (shouldRouteToAppwrite(fnName)) {
        try {
          return await invokeAppwriteHub(fnName, options);
        } catch (err: any) {
          console.error('[Appwrite Bridge Error]:', err.message);
          // Fail-open: if Appwrite fails, let it try Supabase for now during migration
        }
      }

      // 2. SUPABASE FALLBACK (Original Logic)
      const doInvoke = async (token: string | null) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        };
        if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
        if (EDGE_FUNCTIONS_ANON_KEY) headers['apikey'] = EDGE_FUNCTIONS_ANON_KEY;

        const response = await fetch(apiFnUrl(fnName), {
          method: options?.method || 'POST',
          headers,
          body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
        });

        const text = await response.text();
        let data: any = null;
        try { data = JSON.parse(text); } catch { data = text; }
        return { response, data, text };
      };

      try {
        const effectiveToken = getImpersonationToken() ?? getToken();
        let result = await doInvoke(effectiveToken);

        if (result.response.status === 401) {
          const { isSessionAuthFailure } = classifyEdgeError(401, result.text);
          if (isSessionAuthFailure && !getImpersonationToken()) {
            const refreshed = await refreshTokenIfNeeded();
            if (refreshed) result = await doInvoke(getToken());
            else dispatchSessionExpiredOnce();
          }
        }

        if (!result.response.ok) {
          const { code, message } = classifyEdgeError(result.response.status, result.text);
          return { data: null, error: { message, code, status: result.response.status } };
        }

        return { data: result.data, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },
  },
};
