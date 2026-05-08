# 16 — Feature flags + kill switches

**Last verified:** 2026-05-08
**Type:** critical-system card
**Sources:** `supabase/migrations/20260509000000_feature_flags.sql`, `supabase/functions/_shared/featureFlags.ts`, `src/integrations/supabase/transactionalEmailFlag.ts`, `src/integrations/supabase/resumeSectionAiFlag.ts`, DevKit Feature Flags tab.

**Canonical owner:** `feature_flags` table (server-side) + the two `*Flag.ts` constants (frontend-only rollout shims).

---

## Two flag systems run side-by-side

### A. Server-side feature flags (`feature_flags` table)
Resolved by `_shared/featureFlags.ts` → `isFeatureEnabled(flagName, userId?, plan?)`. Precedence (highest → lowest):
1. **Kill switch** — if `kill_switch_function` is set on the flag, the named edge function must 503; flag returns FALSE.
2. **User allow-list** — `userId` ∈ `enabled_user_ids` → TRUE.
3. **Plan allow-list** — plan ∈ `enabled_plans` → TRUE.
4. **Global toggle** — `enabled_globally` → TRUE.
5. **Percentage rollout** — `hash(userId) % 100 < percentage_rollout` → TRUE.
6. else FALSE.

Edited only via DevKit Feature Flags tab (`admin-feature-flags`). Never raw SQL in production.

### B. Frontend rollout shims (compile-time constants)
Single-line booleans the frontend uses to flip between legacy and merged edge functions during the Task #55 / #56 merge campaigns:

| Constant | Controls |
|---|---|
| `USE_MERGED_TRANSACTIONAL_EMAIL` (`transactionalEmailFlag.ts`) | Routes `send-contact-email`, `submit-contact-request`, `send-resume-reminder` callers to the merged `transactional-email` fn. |
| `USE_MERGED_RESUME_SECTION_AI` (`resumeSectionAiFlag.ts`) | Routes `enhance-section`, `tailor-section`, `fill-gap`, `explain-gap` callers to the merged `resume-section-ai` fn. |

These are deploy-time flips — rollback is only valid during the 24 h soak window before legacy fns are deleted (`replit.md`).

## Kill switches
A "kill switch" is a `feature_flags` row whose `kill_switch_function` names an edge fn. When set, the helper returns FALSE so callers degrade gracefully, AND the named edge fn itself should refuse to do work and 503. Treat kill switches as the ops pager — they exist to stop bleeding without a deploy.

## Hard rules
- **No code-side feature gates without a DB row.** If a feature needs a flag, add the row first via DevKit; do not gate behind a hard-coded boolean in code.
- **Kill switches only via DevKit.** Cutting traffic from prod is a privileged operation; raw SQL is forbidden.
- **Frontend flag flips ≠ rollback.** After legacy fns are deleted, the constant must stay `true`.
- Every fail-open path that reads a flag must call `recordOpsHealthEvent()` on the degraded branch (`replit.md`).
