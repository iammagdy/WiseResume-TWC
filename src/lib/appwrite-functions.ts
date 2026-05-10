/**
 * Edge Functions client — Appwrite SDK direct.
 *
 * Routes function calls through `functions.createExecution()` from the
 * Appwrite SDK. The SDK uses the active Appwrite session automatically —
 * no manual JWT headers needed.
 *
 * AI-Hub functions (anything in AI_HUB_FUNCTIONS) are forwarded to the
 * single `ai-gateway` Appwrite Function with `featureName` in the body.
 * All other functions are called directly by their function ID.
 *
 * Behavioral notes vs. former HTTP-proxy path:
 * - `InvokeOptions.headers` and `InvokeOptions.method` are intentional
 *   no-ops. Appwrite SDK executions always use POST; custom headers belong
 *   in the body payload or in Function-level config, not the client call.
 * - The former 401-JWT-refresh retry loop is replaced by catching
 *   `AppwriteException` with code 401/403 and dispatching a
 *   session-expired event. The SDK handles token refresh internally;
 *   a client-side retry is no longer needed.
 */
import { AppwriteException } from 'appwrite';
import { functions } from '@/lib/appwrite';
import { shouldRouteToAppwrite } from '@/lib/appwrite-bridge';
// Session expired handling is now integrated into AuthContext

interface InvokeOptions {
  body?: FormData | Record<string, unknown> | unknown;
  headers?: Record<string, string>;
  method?: string;
}

interface InvokeResult<T> {
  data: T | null;
  error: { message: string; status?: number } | null;
}

function buildBodyPayload(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null) return {};
  if (body instanceof FormData) {
    const obj: Record<string, unknown> = {};
    body.forEach((value, key) => {
      if (typeof value === 'string') obj[key] = value;
    });
    return obj;
  }
  if (typeof body === 'object') return body as Record<string, unknown>;
  return {};
}

export const appwriteFunctions = {
  async invoke<T = unknown>(
    fnName: string,
    options?: InvokeOptions,
  ): Promise<InvokeResult<T>> {
    try {
      const bodyPayload = buildBodyPayload(options?.body);

      let functionId: string;
      let executionBody: string;

      if (shouldRouteToAppwrite(fnName)) {
        functionId = 'ai-gateway';
        executionBody = JSON.stringify({ featureName: fnName, ...bodyPayload });
      } else {
        functionId = fnName;
        executionBody = JSON.stringify(bodyPayload);
      }

      const execution = await functions.createExecution(
        functionId,
        executionBody,
        false,
        '/',
        'POST',
      );

      if (execution.status === 'failed') {
        return {
          data: null,
          error: { message: execution.errors || 'Execution failed. Please try again.' },
        };
      }

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(execution.responseBody);
      } catch {
        parsed = execution.responseBody;
      }

      const statusCode = execution.responseStatusCode;
      if (statusCode >= 400) {
        let message = 'An error occurred. Please try again.';
        if (statusCode === 429) {
          message = 'Too many requests — please wait a moment and try again.';
        } else if (statusCode === 402) {
          message = 'AI credits exhausted. Please check your account.';
        } else if (statusCode === 401 || statusCode === 403) {
          /* Session expired */
          message = 'Session expired — please sign in again.';
        } else if (typeof parsed === 'object' && parsed !== null) {
          const err = parsed as Record<string, unknown>;
          if (typeof err.error === 'string') message = err.error;
          else if (typeof err.message === 'string') message = err.message;
        }
        return { data: null, error: { message, status: statusCode } };
      }

      return { data: parsed as T, error: null };
    } catch (err) {
      if (err instanceof AppwriteException) {
        if (err.code === 401 || err.code === 403) {
          /* Session expired */
          return {
            data: null,
            error: { message: 'Session expired — please sign in again.', status: err.code },
          };
        }
        return {
          data: null,
          error: { message: err.message, status: err.code },
        };
      }
      const rawMessage = err instanceof Error ? err.message : String(err);
      return { data: null, error: { message: rawMessage } };
    }
  },

  functions: {
    async invoke<T = unknown>(
      fnName: string,
      options?: InvokeOptions,
    ): Promise<InvokeResult<T>> {
      return appwriteFunctions.invoke<T>(fnName, options);
    },
  },
};
