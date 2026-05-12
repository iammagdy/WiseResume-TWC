/**
 * Helpers for sending the DevKit admin session token to Appwrite Functions.
 *
 * The token is now a short-lived server-issued session token, not the raw
 * DevKit password. Appwrite SDK executions cannot forward custom HTTP headers,
 * so `appwriteFunctions.invoke` packs this header into the execution body as
 * `__headers.Authorization` for the function runtime to verify.
 */
import { getDevKitToken } from '@/contexts/DevKitSessionContext';

export function devKitAuthHeaders(): Record<string, string> {
  const token = getDevKitToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function devKitInvokeOptions<T = Record<string, unknown>>(
  body?: T,
): { body?: T; headers: Record<string, string> } {
  const headers = devKitAuthHeaders();
  return body === undefined
    ? { headers }
    : { body, headers };
}
