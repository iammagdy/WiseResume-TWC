# WiseHire Phase 1 Surface

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `src/pages/wisehire/`
- `supabase/functions/wisehire-*` (15 functions)
- `src/components/wisehire/` (component folder)
- `src/components/wisehire/WiseHireGuard.tsx`
- `project-governance/PRODUCT.md` §3 (WiseHire Product Scope)
- `project-governance/ARCHITECTURE.md` §5 (WiseHire Tables) + §7 (Edge Functions) + §8 (WiseHire AI Rate Limits)
- `project-governance/CONSTITUTION.md` §7 (WiseHire Governance)
- `project-governance/DECISIONS.md` Decisions #7, #8
- `CHANGELOG.md` (2026-04-15 WiseHire deployment)
- `specs/001-wisehire-hr-platform/spec.md`
- `src/AppInterior.tsx` (`/wisehire/*` routes)

**Canonical owner:** `specs/001-wisehire-hr-platform/spec.md` (scope) + `project-governance/ARCHITECTURE.md` (technical inventory).

---

## Status (today)

Phase 1 is **live**, invite-only. Phases 2–4 are planned (`02-Planned/wisehire-phases-2-4.md`).

→ `CHANGELOG.md` (2026-04-15) confirms all 93 edge functions including 15 `wisehire-*` deployed, full smoke-test pass.

## Routes (live)

→ `src/AppInterior.tsx`

| Route | Page | Public? |
|---|---|---|
| `/waitlist` | `WaitlistPage` | Yes (pre-launch capture) |
| `/enterprise` | `EnterprisePage` | Yes (custom-tier inquiry) |
| `/wisehire/signup` | `WiseHireSignupPage` | Yes (gated by invite token) |
| `/wisehire/signup-early-access/:code` | `WiseHireEarlyAccessPage` | Yes (signed early-access link) |
| `/wisehire/onboarding` | `WiseHireOnboardingPage` | HR-guarded |
| `/wisehire/dashboard` | `WiseHireDashboardPage` | HR-guarded |
| `/wisehire/jd-writer` | `JDWriterPage` | HR-guarded |
| `/wisehire/briefs`, `/wisehire/briefs/:briefId` | `BriefGeneratorPage`, `BriefViewPage` | HR-guarded |
| `/wisehire/pipeline` | `PipelinePage` | HR-guarded |
| `/wisehire/bulk-screen` | `BulkScreenPage` | HR-guarded |
| `/wisehire/scorecards/:candidateId`, `/wisehire/scorecard-templates` | `ScorecardPage`, `ScorecardTemplatesPage` | HR-guarded |
| `/wisehire/talent-pool` | `TalentPoolPage` | HR-guarded |
| `/wisehire/analytics` | `WiseHireAnalyticsPage` | HR-guarded |
| `/wisehire/mask-cvs` | `CandidateMaskingPage` | HR-guarded |
| `/wisehire/clients` | `ClientsPage` | HR-guarded |
| `/wisehire/roles` | `RolesPage` | HR-guarded |
| `/wisehire/subscription`, `/wisehire/settings` | `WiseHireSubscriptionPage`, `WiseHireSettingsPage` | HR-guarded |
| `/share/brief/:shareToken`, `/share/scorecard/:shareToken` | Public read-only views | Yes |

All HR-guarded routes flow through `<WiseHireGuard />` which enforces `profiles.account_type === 'hr'`. → `project-governance/CONSTITUTION.md` §7.4.

## Edge functions (15 wisehire-*)

→ `supabase/functions/`

`wisehire-waitlist-join`, `wisehire-validate-invite`, `wisehire-validate-early-access`, `wisehire-complete-signup`, `wisehire-write-jd`, `wisehire-generate-brief`, `wisehire-bulk-screen`, `wisehire-mask-cvs`, `wisehire-talent-search`, `wisehire-talent-view`, `wisehire-send-outreach`, `wisehire-apply`, plus admin-side `admin-wisehire-invite`, `admin-wisehire-waitlist`.

All public ones (`wisehire-waitlist-join`, `wisehire-validate-early-access`) deployed with `--no-verify-jwt` and bot-guarded internally. → `CHANGELOG.md` 2026-04-15.

## Database tables (17, all RLS-enabled)

→ `project-governance/ARCHITECTURE.md` §5 (WiseHire Tables):

`wisehire_waitlist`, `wisehire_invites`, `wisehire_companies`, `wisehire_roles`, `wisehire_candidates`, `wisehire_candidate_briefs`, `wisehire_pipeline_events`, `wisehire_bulk_screen_jobs`, `wisehire_scorecards`, `wisehire_scorecard_templates`, `wisehire_candidate_notes`, `wisehire_outreach_emails`, `wisehire_clients`, `wisehire_saved_searches`, `wisehire_applications`, `talent_pool_profiles`, `talent_pool_views`.

**Critical FK pattern:** `owner_id` on every WiseHire table is `profiles.id` — **not** `auth.users.id`. The 2026-04-15 fix batch in `CHANGELOG.md` made every WiseHire edge function pre-query `SELECT id FROM profiles WHERE user_id = $userId` before reading or writing these tables.

## Account-type isolation (governance invariant)

- `profiles.account_type` ∈ `{job_seeker, hr}`, NOT NULL, DEFAULT `job_seeker`. **Immutable post-signup.**
- Every `/wisehire/*` route MUST enforce `account_type = 'hr'`. Every WiseResume route MUST reject `hr` accounts.
- Enforced at both the frontend router (`WiseHireGuard`, `JobSeekerRoute`) and the edge function level.

→ `project-governance/CONSTITUTION.md` §7.4.

## Known exceptions / governance carve-outs

- **Desktop-first (Phases 1 & 2)** — explicit, time-limited exception to the platform's mobile-first rule. Mobile responsive deferred to Phase 3. → Decision #8.
- **No free tier** — post-trial lockout shows a "Contact Us" screen, not a degraded free experience. → `project-governance/PRODUCT.md` §3 + Constitution §7.2.
- **Invite-only access (pre-launch)** — admin-generated HMAC-SHA256 signed invite links, 72-hour expiry. → Constitution §7.3.
- **Fail-closed AI** — every WiseHire AI edge function blocks if `ai_usage_logs` is unreachable. → Architecture §8.
- **Candidate data privacy** — owned by HR uploader, stored in `candidate-resumes` Supabase Storage bucket, deleted after the 30-day post-cancellation window, never shared with other HR users. Talent Pool is opt-in only. → Constitution §7.5.

## Pricing

→ `project-governance/PRODUCT.md` §3.

| Tier | Price | Roles | Briefs | Seats | AI |
|---|---|---|---|---|---|
| Starter | $49/mo | 3 active | 5/day (30/mo cap) | 1 | BYOK required |
| Professional | $149/mo | Unlimited | 50/day | 3 | Platform AI |
| Business | $399/mo | Unlimited | Unlimited | 10 | Platform AI + Analytics |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Custom + SSO + SLA |

7-day Professional trial auto-granted on HR signup.
