import { supabase } from '@/integrations/supabase/safeClient';

/**
 * Task #50 — wisehire-access merge (5 → 1).
 *
 * Single one-line flag controls whether the 5 legacy wisehire onboarding
 * functions are reached individually or via the consolidated
 * `wisehire-access` router.
 *
 * Rollback semantics:
 *   - During the 24-hour prod soak the 5 originals remain DEPLOYED in
 *     Supabase even though the source dirs were removed from this repo.
 *     Flipping this flag to `false` during the soak immediately reroutes
 *     every web caller back to the originals — no redeploy required.
 *   - After the downstream "Full edge-function redeploy + platform
 *     verification" task DELETEs the 5 originals from prod, the
 *     fallback path is no longer viable: setting the flag to `false`
 *     would 404 every call. At that point the flag becomes a one-way
 *     latch and this comment block should be removed.
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
 * the same `{ data, error }` shape supabase-js produces. */
export function invokeWisehireAccess<T = unknown>(
  action: WisehireAccessAction,
  body: Record<string, unknown>,
) {
  if (USE_MERGED_WISEHIRE_ACCESS) {
    return supabase.functions.invoke<T>('wisehire-access', {
      body: { action, ...body },
    });
  }
  return supabase.functions.invoke<T>(LEGACY_FN_BY_ACTION[action], { body });
}
