import { appwriteFunctions } from '@/lib/appwrite-functions';

/**
 * Task #50 — wisehire-access merge (5 → 1).
 *
 * Routes all WiseHire onboarding actions through the consolidated
 * `wisehire-access` Appwrite Function via the edge-functions invoker.
 */
export const USE_MERGED_WISEHIRE_ACCESS = true;

export type WisehireAccessAction =
  | 'waitlist-check-email'
  | 'waitlist-join'
  | 'validate-early-access'
  | 'validate-invite'
  | 'complete-signup';

const LEGACY_FN_BY_ACTION: Record<WisehireAccessAction, string> = {
  'waitlist-check-email': 'wisehire-waitlist-check-email',
  'waitlist-join':         'wisehire-waitlist-join',
  'validate-early-access': 'wisehire-validate-early-access',
  'validate-invite':       'wisehire-validate-invite',
  'complete-signup':       'wisehire-complete-signup',
};

/** Invoke the wisehire-access router (or its legacy equivalent) and return
 * the same `{ data, error }` shape the SDK produces. */
export function invokeWisehireAccess<T = unknown>(
  action: WisehireAccessAction,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  const fnName = USE_MERGED_WISEHIRE_ACCESS
    ? 'wisehire-access'
    : LEGACY_FN_BY_ACTION[action];

  const payload = USE_MERGED_WISEHIRE_ACCESS
    ? { action, ...body }
    : body;

  return appwriteFunctions.invoke<T>(fnName, { body: payload });
}
