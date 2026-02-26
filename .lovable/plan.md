
1) Confirmed root cause from current traces
- The bug report dialog submits, then immediately shows “Failed to send report” (seen in session replay).
- The request is going to a different backend endpoint than the one this project’s backend function logs belong to.
- In this project, the `send-bug-report` backend function received no calls in logs, which explains why previous backend edits here did not stop the 500 loop.
- There is also identity mismatch risk: request payload user id and auth token user id can diverge, which can break inserts on stricter schemas.

2) Implementation approach (to make reports reliable even with backend drift)
- Update `src/components/BugReportDialog.tsx` to use the same active authenticated user source as the app session (`useAuth`) instead of separate session lookups.
- Keep function submission, but add resilient fallback:
  - Primary: invoke `send-bug-report`.
  - Fallback on failure: direct insert into `bug_reports` with a minimal, schema-safe field set.
- This prevents user-visible failure loops even if function deployment/schema differs across environments.

3) Concrete code changes planned
- `src/components/BugReportDialog.tsx`
  - Replace ad-hoc auth retrieval with `useAuth()` values (current active user/session).
  - Build a normalized report object once.
  - Submit flow:
    1. Try `functions.invoke('send-bug-report', { body })`
    2. If it fails, attempt `from('bug_reports').insert(minimalReportRow)`
    3. If fallback succeeds, show success state and clear tracked errors.
    4. If both fail, keep current error UI.
  - Preserve mobile UX behavior: spinner + no blank state.
- `supabase/functions/send-bug-report/index.ts`
  - Harden identity handling:
    - If auth token resolves a user, prioritize token user id/email over payload values.
    - Validate `user_id` format before insert; sanitize invalid values.
  - Improve diagnostics:
    - Include safe error metadata in logs/response for insert failures (code/message/details) to avoid opaque `"Failed to save report"` loops.
- Optional but recommended adjacent hardening:
  - Apply the same auth/fallback pattern to `FeatureRequestDialog` to avoid the same failure class there.

4) Why this plan should stop the recurring 500 loop
- It removes dependence on one fragile path (single function call).
- It keeps report capture working even when backend function route/schema drifts.
- It ensures user identity used in writes matches current authenticated session.
- It gives actionable diagnostics for any future failure instead of a generic message.

5) Validation steps after implementation
- Reproduce from `/editor`: trigger “Report Bug” and submit.
- Verify UI result:
  - Shows success state (not “Failed to send report”).
  - No blank screen during send (spinner remains visible).
- Verify backend persistence:
  - Confirm a new row appears in `bug_reports` for current user.
- Verify failure-resilience:
  - Temporarily simulate function failure and confirm direct insert fallback still succeeds.
- Mobile-first verification:
  - Check the full flow at xs (375px) to confirm dialog layout, submit state, and error/success messages remain usable.

Technical notes
- Files to update first: `src/components/BugReportDialog.tsx`, `supabase/functions/send-bug-report/index.ts`.
- Keep changes narrowly scoped to support submission flow to avoid regressions in unrelated data paths.
- If you approve, I’ll implement this in that sequence and then validate end-to-end.
