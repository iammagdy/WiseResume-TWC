/**
 * Single source of truth for the Task #55 transactional-email merge
 * rollout flag. Imported by:
 *
 *   - `src/integrations/supabase/edgeFunctions.ts`
 *     (`rewriteTransactionalEmailInvoke`)
 *   - `src/components/portfolio/public/PortfolioContactForm.tsx`
 *     (raw fetch path that bypasses the rewrite helper)
 *   - `src/lib/sendFeedback.ts`
 *     (useDirectSupabase path that bypasses the rewrite helper)
 *
 * Flip this single constant to roll forward / roll back across all
 * call sites simultaneously. Rollback is only valid against an
 * environment where the three originals (`send-contact-email`,
 * `submit-contact-request`, `send-resume-reminder`) are still
 * DEPLOYED — i.e. prod during the 24-hour soak window before the
 * downstream redeploy task runs the platform-side delete. After
 * deletion (or in any environment redeployed strictly from this
 * source state), this flag has no fallback target and must stay
 * `true`.
 */
export const USE_MERGED_TRANSACTIONAL_EMAIL = true;
