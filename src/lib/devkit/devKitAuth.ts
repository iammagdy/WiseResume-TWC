/**
 * AUTH-5: helpers for sending the DevKit admin session token to the
 * admin-* Edge Functions over the `Authorization: Bearer …` header.
 *
 * Before AUTH-5 the token was sent inside the JSON request body as
 * `password`. That was both a transport hazard (token landed in any
 * middleware that logged request bodies) and conflated identity with
 * payload. The body-`password` path has been removed from
 * `requireAdminAuth` — every admin function now reads the token from
 * the Authorization header.
 */
import { getDevKitToken } from '@/contexts/DevKitSessionContext';

/**
 * Build the Authorization header for an admin Edge Function call.
 * Returns an empty record when no DevKit session is active so callers
 * can spread the result unconditionally.
 */
export function devKitAuthHeaders(): Record<string, string> {
  const token = getDevKitToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Build the `{ body, headers }` options object for an admin Edge Function
 * invocation. `body` is forwarded as-is; the DevKit session token is
 * attached as `Authorization: Bearer …`. Use this for every admin-* /
 * DevKit edge call:
 *
 *     await edgeFunctions.invoke(
 *       'admin-list-users',
 *       devKitInvokeOptions({ page: 1 }),
 *     );
 */
export function devKitInvokeOptions<T = Record<string, unknown>>(
  body?: T,
): { body?: T; headers: Record<string, string> } {
  const headers = devKitAuthHeaders();
  return body === undefined
    ? { headers }
    : { body, headers };
}
