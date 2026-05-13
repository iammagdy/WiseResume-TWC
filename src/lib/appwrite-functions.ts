/**
 * Appwrite Functions client.
 *
 * Routes function calls through `functions.createExecution()` from the Appwrite
 * SDK. AI-Hub feature calls are forwarded to the single `ai-gateway` function.
 * Custom headers are packed into `__headers` because SDK executions do not send
 * arbitrary HTTP headers to function runtimes.
 */
import { AppwriteException } from 'appwrite';
import { functions } from '@/lib/appwrite';
import { shouldRouteToAppwrite } from '@/lib/appwrite-bridge';

interface InvokeOptions {
  body?: FormData | Record<string, unknown> | unknown;
  headers?: Record<string, string>;
  method?: string;
}

interface InvokeResult<T> {
  data: T | null;
  error: { message: string; status?: number; code?: string; raw?: unknown } | null;
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

function isAdminFunction(fnName: string): boolean {
  return fnName.startsWith('admin-') || fnName === 'inspect-ai-keys';
}

function messageFromPayload(parsed: unknown): string | null {
  if (typeof parsed === 'string' && parsed.trim()) return parsed;
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.error === 'string') return obj.error;
  if (typeof obj.message === 'string') return obj.message;
  return null;
}

function classifyHttpError(fnName: string, statusCode: number, parsed: unknown): string {
  const payloadMessage = messageFromPayload(parsed);
  if (payloadMessage) return payloadMessage;

  if (statusCode === 429) return 'Too many requests - please wait a moment and try again.';
  if (statusCode === 402) return 'AI credits exhausted. Please check your account.';
  if (statusCode === 401 || statusCode === 403) {
    return isAdminFunction(fnName)
      ? 'DevKit session unauthorized or expired - re-enter the DevKit password.'
      : 'Appwrite session expired - please sign in again.';
  }
  if (statusCode === 404) return `Appwrite Function not found or not deployed: ${fnName}`;
  if (statusCode >= 500) return `Appwrite Function runtime failed for ${fnName}.`;
  return 'An error occurred. Please try again.';
}

function inferStatusFromMessage(message: string | undefined): number | undefined {
  if (!message) return undefined;
  const match = message.match(/\bstatus code (\d{3})\b/i) || message.match(/\bHTTP (\d{3})\b/i);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function classifyAppwriteException(fnName: string, err: AppwriteException): string {
  const raw = err.message || '';
  if (err.code === 401 || err.code === 403) {
    return isAdminFunction(fnName)
      ? 'Appwrite refused to execute the DevKit function. Check the Appwrite user session, function execute permissions, and DevKit token.'
      : 'Appwrite session expired - please sign in again.';
  }
  if (err.code === 404 || /function.*could not be found|requested id could not be found/i.test(raw)) {
    return `Appwrite Function not found or not deployed: ${fnName}`;
  }
  return raw || `Appwrite Function request failed for ${fnName}.`;
}

export const appwriteFunctions = {
  async invoke<T = unknown>(
    fnName: string,
    options?: InvokeOptions,
  ): Promise<InvokeResult<T>> {
    try {
      const bodyPayload = buildBodyPayload(options?.body);
      const finalPayload = {
        ...bodyPayload,
        __headers: options?.headers || {},
      };

      const functionId = shouldRouteToAppwrite(fnName) ? 'ai-gateway' : fnName;
      const executionBody = shouldRouteToAppwrite(fnName)
        ? JSON.stringify({ featureName: fnName, ...finalPayload })
        : JSON.stringify(finalPayload);

      const execution = await functions.createExecution(
        functionId,
        executionBody,
        false,
        '/',
        'POST',
      );

      if (execution.status === 'failed') {
        console.error('[appwriteFunctions] execution failed', execution.errors);
        return {
          data: null,
          error: {
            message: execution.errors || `Appwrite Function runtime failed for ${functionId}.`,
            code: 'FUNCTION_RUNTIME_FAILED',
            raw: execution,
          },
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
        return {
          data: null,
          error: {
            message: classifyHttpError(fnName, statusCode, parsed),
            status: statusCode,
            raw: parsed,
          },
        };
      }

      // Unwrap AI-gateway envelope { status, data, message } when the call was
      // routed through ai-gateway. Non-AI functions return data directly.
      if (
        shouldRouteToAppwrite(fnName) &&
        parsed !== null &&
        typeof parsed === 'object' &&
        'data' in (parsed as object)
      ) {
        const envelope = parsed as { status?: string; data: unknown; message?: string };
        if (envelope.status === 'error') {
          const inferredStatus = inferStatusFromMessage(envelope.message);
          return {
            data: null,
            error: {
              message:
                inferredStatus !== undefined
                  ? classifyHttpError(fnName, inferredStatus, parsed)
                  : (envelope.message || 'AI function returned an error.'),
              status: inferredStatus,
              raw: parsed,
            },
          };
        }
        return { data: envelope.data as T, error: null };
      }

      return { data: parsed as T, error: null };
    } catch (err) {
      if (err instanceof AppwriteException) {
        return {
          data: null,
          error: {
            message: classifyAppwriteException(fnName, err),
            status: err.code,
            raw: err,
          },
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
