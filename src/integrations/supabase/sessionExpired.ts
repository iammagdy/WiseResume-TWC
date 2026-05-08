/**
 * LEGACY STUB — pending Appwrite migration.
 *
 * Previously dispatched an `app:session-expired` event when the
 * Kinde -> Supabase bridge surfaced an auth-rejection error. With the
 * bridge removed, Appwrite's own session lifecycle is the source of
 * truth and this helper is a no-op.
 */
export function dispatchSessionExpiredOnce(): void {
  /* no-op */
}
