/**
 * Single source of truth for the transactional-email merge rollout flag.
 *
 * Flip this single constant to roll forward / roll back across all call
 * sites simultaneously. With Supabase removed, this must stay `true` —
 * the legacy fallback functions no longer exist.
 */
export const USE_MERGED_TRANSACTIONAL_EMAIL = true;
