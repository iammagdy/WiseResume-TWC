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
import { getAppwriteJWT } from '@/lib/appwriteJWT';

interface InvokeOptions {
  body?: FormData | Record<string, unknown> | unknown;
  headers?: Record<string, string>;
  method?: string;
}

interface InvokeResult<T> {
  data: T | null;
  error: { message: string; status?: number; code?: string; raw?: unknown } | null;
}

type SerializedFile = {
  field: string;
  name: string;
  type: string;
  size: number;
  base64: string;
};

const COUPON_FUNCTIONS = new Set(['coupons', 'get-subscription']);
const WISEHIRE_FUNCTIONS = new Set([
  'wisehire-write-jd',
  'wisehire-generate-brief',
  'wisehire-bulk-screen',
  'wisehire-mask-cvs',
  'wisehire-send-outreach',
  'wisehire-talent-search',
  'wisehire-talent-view',
  'wisehire-access',
]);
const PUBLIC_SHARE_FUNCTIONS = new Set(['verify-share-password']);

function isCouponFunction(fnName: string): boolean {
  return COUPON_FUNCTIONS.has(fnName);
}

function isWiseHireFunction(fnName: string): boolean {
  return WISEHIRE_FUNCTIONS.has(fnName);
}

function isPublicShareFunction(fnName: string): boolean {
  return PUBLIC_SHARE_FUNCTIONS.has(fnName);
}

async function serializeFormFile(field: string, value: File): Promise<SerializedFile> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read uploaded file.'));
    reader.readAsDataURL(value);
  });
  return {
    field,
    name: value.name,
    type: value.type || 'application/octet-stream',
    size: value.size,
    base64: dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl,
  };
}

async function buildBodyPayload(body: unknown): Promise<Record<string, unknown>> {
  if (body === undefined || body === null) return {};
  if (body instanceof FormData) {
    const obj: Record<string, unknown> = {};
    const files: SerializedFile[] = [];
    const fileReads: Promise<void>[] = [];
    body.forEach((value, key) => {
      if (typeof value === 'string') {
        if (obj[key] === undefined) obj[key] = value;
        else if (Array.isArray(obj[key])) (obj[key] as unknown[]).push(value);
        else obj[key] = [obj[key], value];
        return;
      }
      if (typeof File !== 'undefined' && value instanceof File) {
        fileReads.push(serializeFormFile(key, value).then(file => { files.push(file); }));
      }
    });
    await Promise.all(fileReads);
    if (files.length) obj.__files = files;
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
      const bodyPayload = await buildBodyPayload(options?.body);
      const headers = { ...(options?.headers || {}) };
      if (!headers.Authorization && !isAdminFunction(fnName)) {
        const jwt = await getAppwriteJWT();
        if (jwt) headers['X-Appwrite-JWT'] = jwt;
      }
      const finalPayload = {
        ...bodyPayload,
        __headers: headers,
      };

      const deriveCouponAction = (name: string): string => {
        if (name === 'validate-coupon') return 'validate';
        if (name === 'redeem-coupon') return 'redeem';
        if (name === 'get-subscription') return 'get-subscription';
        return (bodyPayload as Record<string, unknown>).action as string ?? 'validate';
      };

      const routeToAiGateway = shouldRouteToAppwrite(fnName);
      const routeToCoupons = isCouponFunction(fnName);
      const routeToWiseHire = isWiseHireFunction(fnName);
      const routeToPublicShare = isPublicShareFunction(fnName);
      const functionId = routeToAiGateway
        ? 'ai-gateway'
        : routeToCoupons
          ? 'coupons'
          : routeToWiseHire
            ? 'wisehire-gateway'
            : routeToPublicShare
              ? 'public-share'
            : fnName;
      const executionBody = routeToAiGateway
        ? JSON.stringify({ featureName: fnName, ...finalPayload })
        : routeToCoupons
          ? JSON.stringify({
              action: deriveCouponAction(fnName),
              ...finalPayload,
            })
          : routeToWiseHire
            ? JSON.stringify({
                ...finalPayload,
                action: fnName,
                wisehire_action: typeof bodyPayload.action === 'string' ? bodyPayload.action : undefined,
              })
            : routeToPublicShare
              ? JSON.stringify({ ...finalPayload, action: fnName })
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
        (routeToAiGateway || routeToCoupons || routeToWiseHire || routeToPublicShare) &&
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
