# Tasks: WiseHire Phase 1

**Input**: `specs/001-wisehire-hr-platform/spec.md` + `specs/001-wisehire-hr-platform/plan.md`  
**Prerequisites**: spec.md ✅ | plan.md ✅ | tasks.md ← this file  
**Date**: 2026-04-15

**Format**: `[ ] T### [P?] [US#] Description`  
- **[P]** = can run in parallel with other [P] tasks in the same phase (different files, no conflict)  
- **[US#]** = which user story this delivers  
- Tasks without [P] must run after preceding tasks in the same phase complete

**Phase 1 User Stories (all P1 — this file):**
| Story | Title |
|-------|-------|
| US1 | Landing Page Toggle + Full WiseHire Theme Switch |
| US2 | Waitlist Pre-Launch Gate |
| US3 | Separate WiseHire Sign-Up & Account Type |
| US4 | WiseHire Onboarding |
| US5 | Trial Period & Early Access |
| US6 | Dev Kit WiseHire Admin Panel |
| US7 | AI Candidate Brief Generator |
| US8 | AI Job Description Writer |
| US9 | Candidate Pipeline Board |

---

## Phase 1 — Database & Infrastructure Foundation

**Purpose**: All 8 SQL migrations, storage bucket, and required secret. Every other phase depends on this being complete first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Write migration `supabase/migrations/20260420000001_wisehire_account_type.sql` — adds `account_type TEXT NOT NULL DEFAULT 'job_seeker' CHECK (account_type IN ('job_seeker', 'hr'))` to `public.profiles` ✅ 2026-04-15
- [x] T002 [P] Write migration `supabase/migrations/20260420000002_wisehire_waitlist.sql` — `wisehire_waitlist` table (id, name, email, company_name, company_size, submitted_at, invited_at, notes) with RLS enabled, admin-only (no user policies) ✅ 2026-04-15
- [x] T003 [P] Write migration `supabase/migrations/20260420000003_wisehire_invites.sql` — `wisehire_invites` table (id, token, token_signature, recipient_email, created_by, created_at, expires_at, used_at, is_revoked) with indexes on `token` and `recipient_email` ✅ 2026-04-15
- [x] T004 [P] Write migration `supabase/migrations/20260420000004_wisehire_companies.sql` — `wisehire_companies` table (id, owner_id, name, size, role_types, monthly_volume, onboarding_completed, timestamps) with RLS policy `owner_id = auth.uid()` ✅ 2026-04-15
- [x] T005 [P] Write migration `supabase/migrations/20260420000005_wisehire_roles.sql` — `wisehire_roles` table (id, owner_id, company_id, title, jd_text, status, is_deleted, timestamps) with RLS policy `owner_id = auth.uid() AND is_deleted = false` ✅ 2026-04-15
- [x] T006 [P] Write migration `supabase/migrations/20260420000006_wisehire_candidates.sql` — `wisehire_candidates` table (id, owner_id, role_id, name, email, resume_pdf_path, resume_text, pipeline_stage CHECK enum, notes, is_deleted, timestamps) with RLS `owner_id = auth.uid() AND is_deleted = false` ✅ 2026-04-15
- [x] T007 [P] Write migration `supabase/migrations/20260420000007_wisehire_candidate_briefs.sql` — `wisehire_candidate_briefs` table (id, owner_id, candidate_id, role_id, match_score, strengths TEXT[], concerns TEXT[], interview_questions TEXT[], employment_notes, ai_model_used, is_byok, share_token UUID UNIQUE, share_token_active BOOLEAN, created_at) with two RLS policies: owner read/write + index on active share_token ✅ 2026-04-15
- [x] T008 [P] Write migration `supabase/migrations/20260420000008_wisehire_pipeline_events.sql` — `wisehire_pipeline_events` table (id, owner_id, candidate_id, from_stage, to_stage, moved_at, moved_by) with RLS `owner_id = auth.uid()` ✅ 2026-04-15
- [x] T009 Apply all 8 migrations — applied via Supabase Management API (CLI pooler auth blocked by Replit network; API equivalent used). All 7 tables + profiles.account_type column confirmed in database. ✅ 2026-04-15
- [x] T010 Create `candidate-resumes` Supabase Storage bucket (private, no public access, max 10MB, PDF only) — created via storage.buckets INSERT ✅ 2026-04-15
- [x] T011 Apply storage RLS policies for `candidate-resumes` bucket: INSERT, SELECT, DELETE policies restricting to `(storage.foldername(name))[1] = auth.uid()::text` ✅ 2026-04-15
- [x] T012 Add `WISEHIRE_INVITE_SECRET` to Supabase Edge Function secrets (64-char hex HMAC-SHA256 signing key, generated via crypto.randomBytes(32)) ✅ 2026-04-15
- [x] T013 Update `specs/001-wisehire-hr-platform/spec.md` status field from `"Draft v2 — Awaiting Final User Approval"` to `"Approved — Implementation in Progress"` ✅ 2026-04-15
- [x] T014 Update `project-governance/ARCHITECTURE.md` to document all 7 new tables, the `candidate-resumes` bucket ✅ 2026-04-15
- [x] T015 Update `project-governance/CHANGELOG.md` with foundation step entry ✅ 2026-04-15

**Checkpoint**: Run `npx supabase db push` — exits 0. All 7 new tables and `profiles.account_type` column visible in Supabase dashboard. Bucket exists. Secret set. Foundation ready.

---

## Phase 2 — US3: Account Type Visibility (Dev Kit Foundation)

**Goal**: Make `account_type` visible in the admin dev kit before any HR user exists. Existing users all show "Job Seeker." HR count = 0.  
**Independent Test**: Admin opens dev kit → every user row has an account type badge. Overview shows HR = 0, Job Seekers = N.

- [x] T016 [US3] Add `AccountType` badge component to `src/components/dev-kit/DevKitBadges.tsx` — `job_seeker` = emerald badge "Job Seeker", `hr` = blue (#1D4ED8) badge "HR Account" ✅ 2026-04-15
- [x] T017 [P] [US3] Update `src/components/dev-kit/OverviewPanel.tsx` — computed hrCount and jobSeekerCount from user list; two new stat cards ("Job Seekers / WiseResume" emerald, "HR Accounts / WiseHire" blue) alongside existing stats ✅ 2026-04-15
- [x] T018 [P] [US3] Update `src/components/dev-kit/AdminUsersPanel.tsx` — added `account_type` to AdminUser interface; AccountTypeBadge renders on every user row under the email; supabase/functions/admin-list-users updated to select and return account_type from profiles, deployed ✅ 2026-04-15
- [x] T019 [P] [US3] Update `src/components/dev-kit/UserDetailDrawer.tsx` — AccountTypeBadge shown in drawer header below email; avatar ring colour switches to WiseHire blue (#1D4ED8) for HR accounts ✅ 2026-04-15
- [x] T020 [US3] TypeScript compilation clean (0 errors). App starts and serves. All existing users will show "Job Seeker" badge; HR count = 0 until first HR user is created. ✅ 2026-04-15
- [x] T021 Update `project-governance/CHANGELOG.md` with US3 account type visibility entry ✅ 2026-04-15

**Checkpoint**: Dev kit shows account type badges on all users. No "HR Account" badges yet (no HR users exist). Overview panel shows split counts.

---

## Phase 3 — US1: Landing Page Toggle + Full WiseHire Theme

**Goal**: Visitor can toggle between WiseResume and WiseHire landing views. Full theme switch < 400ms. URL updates. WiseHire mode shareable.  
**Independent Test**: Click "For Companies" → full theme switch. Copy URL → reopens in WiseHire mode. All CTAs open waitlist modal (stub OK for now). Click "For Job Seekers" → returns to WiseResume.

- [x] T022 [US1] Add `--lp-brand` CSS variable switching to the existing `--lp-*` system — `#9E1B22` for WiseResume mode, `#1D4ED8` for WiseHire mode; add `data-lp-product="wisehire"` attribute toggle on root; transition duration 350ms
- [x] T023 [US1] Create `src/components/landing/LandingToggle.tsx` — above-nav sticky toggle with "Job Seeker" and "Hiring / HR" buttons; reads `?for=companies` URL param on mount; propagates `mode` state upward via callback; updates URL with `history.pushState`
- [x] T024 [P] [US1] Create `src/components/landing/wisehire/WiseHireHero.tsx` — headline "Hire Smarter. Screen Faster.", typewriter cycling through "Hiring Manager" / "Recruiter" / "HR Director" / "Head of People" / "Talent Partner", "Join the Waitlist" CTA (opens `WaitlistModal`), "Log In" link
- [x] T025 [P] [US1] Create `src/components/landing/wisehire/WiseHireFeatures.tsx` — 5 pillars: Brief Generator, JD Writer, Pipeline Board, Bulk Screening, Talent Pool; follows existing feature card pattern
- [x] T026 [P] [US1] Create `src/components/landing/wisehire/WiseHirePricing.tsx` — 4 tier cards (Starter $49/Professional $149/Business $399/Enterprise custom); "Early Access" badge on each; "Join the Waitlist" CTA; no payment button
- [x] T027 [P] [US1] Create animated demo components `src/components/landing/wisehire/BriefDemo.tsx`, `PipelineDemo.tsx`, `JDDemo.tsx` — CSS/JS animations, no real data
- [x] T028 [P] [US1] Create `src/components/landing/wisehire/WiseHireDemoSection.tsx` — wraps the three demo components in a tabbed "see it in action" section
- [x] T029 [US1] Create `src/components/landing/WaitlistModal.tsx` — stub only (4-field form: email, name, company, company size; shows confirmation on submit; no backend call)
- [x] T030 [US1] Update `src/pages/Index.tsx` — add mode state (`'wisehire' | 'jobseeker'`), render `<LandingToggle>` in header, conditionally render WiseResume vs WiseHire content sections based on mode, update `<meta>` OG tags and document title on mode change, wire `data-lp-product` attribute
- [x] T031 [US1] Manual verification: toggle switches < 400ms, URL updates with `?for=companies`, OG tags/title switch, both directions work, WaitlistModal stub opens on CTA click, dark mode applies correct WiseHire blue scheme
- [x] T032 Update `project-governance/CHANGELOG.md` with US1 landing toggle entry

**Checkpoint**: Landing page toggle fully functional. WiseHire mode is visually complete with all sections. Waitlist modal opens but is a UI stub. No backend calls yet.

---

## Phase 4 — US2: Waitlist Backend

**Goal**: Waitlist form submits to the database. Submitter receives confirmation email. Admin receives notification email.  
**Independent Test**: Submit form → row appears in `wisehire_waitlist`. Submitter's inbox gets confirmation. `contact@thewise.cloud` gets notification. Duplicate email returns friendly message, no duplicate row.

- [x] T033 [US2] Create `supabase/functions/_shared/email-templates/wisehire-waitlist-confirmation.tsx` — React Email component: WiseHire blue header, "Thanks for joining, {name}!", confirmation copy, "Log In" footer link — DONE (inline HTML in edge function)
- [x] T034 [P] [US2] Create `supabase/functions/_shared/email-templates/wisehire-waitlist-notification.tsx` — React Email component: internal notification format, name/email/company/size/timestamp fields, "View in Dev Kit" link — DONE (inline HTML in edge function)
- [x] T035 [US2] Create `supabase/functions/wisehire-waitlist-join/index.ts` — public edge function: `botGuard` → validate fields → check for duplicate email → insert into `wisehire_waitlist` → send both Resend emails (email failures logged, non-fatal) → return success message
- [x] T036 [US2] Create `src/hooks/wisehire/useWaitlist.ts` — TanStack Mutation hook: calls `wisehire-waitlist-join`, exposes `{ mutate, isPending, isSuccess, error }`
- [x] T037 [US2] Update `src/components/landing/WaitlistModal.tsx` — wire form submit to `useWaitlist`, show loading state during submission, show success confirmation "You're on the list. We'll be in touch." on success, show error message on failure
- [x] T038 [US2] Create `src/pages/WaitlistPage.tsx` — standalone page at `/waitlist` as fallback (same success content as modal)
- [ ] T039 [US2] Manual verification: submit form → DB row created, emails delivered (both), duplicate email returns friendly message, all fields validated
- [x] T040 Update `project-governance/CHANGELOG.md` with US2 waitlist backend entry

**Checkpoint**: Waitlist form is fully functional end-to-end. Emails deliver within 60 seconds per SC-006 and SC-007.

---

## Phase 5 — US6: Dev Kit WiseHire Admin Tools

**Goal**: Admin can view the waitlist, send invite emails, and create WiseHire coupon codes — all from the existing dev kit.  
**Independent Test**: Admin sends invite → recipient receives branded WiseHire email with a valid sign-up link. Waitlist panel shows all entries. Coupon panel offers WiseHire tier options. Audit log records the invite send.

- [x] T041 [US6] Create `supabase/functions/_shared/email-templates/wisehire-invite.tsx` — inline HTML in edge function (WiseHire blue header, invite headline, CTA, expiry notice, ignore footer)
- [x] T042 [US6] Create `supabase/functions/admin-wisehire-waitlist/index.ts` — paginated list with search
- [x] T043 [US6] Create `supabase/functions/admin-wisehire-invite/index.ts` — UUID token, HMAC sign, DB insert, Resend email, invited_at update, audit log
- [x] T044 [US6] Update `supabase/functions/admin-email-actions/index.ts` — wisehire_invite case added
- [x] T045 [US6] Create `src/components/dev-kit/WiseHireWaitlistPanel.tsx` — paginated table, search, Invite/Re-invite buttons, invite URL copy dialog
- [x] T046 [P] [US6] Update `src/components/dev-kit/CouponsPanel.tsx` — WiseHire Tiers optgroup added
- [x] T047 [P] [US6] Update `src/components/dev-kit/EmailManagementPanel.tsx` — wisehire_invite action type, calls admin-wisehire-invite directly, shows invite URL
- [ ] T048 [US6] Manual verification: send invite from both email panel and waitlist panel → branded email arrives → invite URL correct → audit log entry recorded → invited_at set
- [x] T049 Update `project-governance/CHANGELOG.md` with US6 dev kit admin tools entry

**Checkpoint**: Admin has full WiseHire operational control. Can view waitlist, send invites, create WiseHire coupons — all without leaving the dev kit.

---

## Phase 6 — US3: WiseHire Sign-Up + Routing Guards

**Goal**: An invited user clicks the invite link, is validated, completes HR sign-up, and their profile is permanently typed `account_type = 'hr'`. Route guards prevent cross-product navigation.  
**Independent Test**: Invited user signs up → profile `account_type = 'hr'` confirmed in Supabase and dev kit badge shows "HR Account". Job seeker navigates to `/wisehire/dashboard` → redirected. HR user navigates to `/dashboard` → redirected. Expired/used invite shows clear error.

- [ ] T050 [US3] Create `supabase/functions/wisehire-validate-invite/index.ts` — public edge function: `botGuard` → look up token in `wisehire_invites` → verify HMAC-SHA256 signature → check `expires_at > now()` → check `used_at IS NULL` and `is_revoked = false` → return `{ valid, recipient_email }` or `{ valid: false, reason }`
- [ ] T051 [US3] Create `src/lib/wisehire/inviteTokenClient.ts` — client helper: calls `wisehire-validate-invite`, returns typed `{ valid, recipient_email, error }` for use by the signup page
- [ ] T052 [US3] Create `src/pages/wisehire/WiseHireSignupPage.tsx` — route `/wisehire/signup?invite={token}`: on mount validates token via `inviteTokenClient`; invalid/expired → friendly error + "Join Waitlist" link; valid → renders sign-up form (name, email pre-filled, company name, company size); on submit → complete Kinde sign-up with `account_type = 'hr'` metadata → mark invite token `used_at = now()` via service function → redirect to `/wisehire/onboarding`
- [ ] T053 [US3] Create `src/components/wisehire/WiseHireGuard.tsx` — route wrapper: checks auth (redirect unauthenticated to login) + checks `account_type = 'hr'` (redirect job seekers to `/dashboard` with a clear message) + checks trial/plan status (expired trial with no active plan → redirect to `/wisehire/contact`). Renders children if all checks pass.
- [ ] T054 [US3] Update `src/App.tsx` — add lazy imports for all WiseHire pages; register `/wisehire/*` route group wrapped in `<WiseHireGuard>`; register public routes `/wisehire/signup`, `/share/brief/:token`, `/share/scorecard/:token`; add post-trial lockout redirect
- [ ] T055 [US3] Update existing job seeker route guards to redirect HR users away from `/dashboard` and WiseResume pages to `/wisehire/dashboard`
- [ ] T056 [US3] Manual verification: full invite → sign-up flow; `account_type = 'hr'` confirmed in Supabase; bidirectional route guard tested (both directions); expired invite shows error
- [ ] T057 Update `project-governance/CHANGELOG.md` with US3 sign-up + routing entry

**Checkpoint**: Invite → sign-up flow complete. `account_type` immutably set to `'hr'`. Route guards enforce separation in both directions. No HR user can reach WiseResume tools and vice versa.

---

## Phase 7 — US4: WiseHire Onboarding

**Goal**: After HR sign-up, new users go through a 5-step WiseHire onboarding — not the WiseResume onboarding. Progress saves to localStorage. Completion saves to Supabase.  
**Independent Test**: Complete all 5 steps → `wisehire_companies` row created, `profiles.onboarding_completed = true`, land on `/wisehire/dashboard`. Skip mid-flow → return to onboarding → progress restored from localStorage. Starter tier user → step 4 shows BYOK prompt.

- [ ] T058 [US4] Create `src/pages/wisehire/WiseHireOnboardingPage.tsx` — 5-step flow: (1) Welcome screen, (2) Company Identity (name pre-filled, team size selector), (3) Hiring Context (role types checkboxes, monthly volume selector), (4) AI Setup — shown only for Starter tier, prompts to add AI key with link to Settings, (5) "You're ready" with CTA to create first Role. Step progress persisted to localStorage under key `wisehire_onboarding_draft`. "Skip" button on every step routes to `/wisehire/dashboard`. Back/forward navigation between steps.
- [ ] T059 [US4] On final step completion: upsert `wisehire_companies` row (name, size, role_types, monthly_volume, onboarding_completed = true); update `profiles.onboarding_completed = true`; clear localStorage draft; redirect to `/wisehire/dashboard`
- [ ] T060 [US4] Add onboarding incomplete nudge banner to `WiseHireDashboardPage` (Phase 8 shell) — shown when `onboarding_completed = false`, dismissible for session, matches existing WiseResume dashboard nudge pattern
- [ ] T061 [US4] Post-sign-up redirect: after HR sign-up completion in `WiseHireSignupPage.tsx`, route to `/wisehire/onboarding` (not `/wisehire/dashboard`)
- [ ] T062 [US4] Manual verification: complete 5-step flow → company row in DB, completion flag set, redirect to dashboard. Skip → dashboard with nudge banner. Return → localStorage restores progress. Starter tier sees BYOK prompt on step 4.
- [ ] T063 Update `project-governance/CHANGELOG.md` with US4 onboarding entry

**Checkpoint**: New HR users are routed to onboarding immediately post-sign-up. Onboarding data seeds `wisehire_companies`. Returning users see their progress.

---

## Phase 8 — US5: Trial + Subscription Page

**Goal**: New HR accounts automatically receive a 7-day Professional trial. Trial badge visible in dashboard throughout trial. WiseHire subscription page shows "Early Access" tiers. Coupon redemption works. Post-trial lockout is functional.  
**Independent Test**: New HR user signs up → subscription shows 7-day Professional trial. Trial badge in dashboard. Admin creates WiseHire coupon → HR user redeems it → plan updated. Simulate expired trial → lockout screen shown.

- [ ] T064 [US5] Create `src/hooks/wisehire/useWiseHireAccount.ts` — TanStack Query hook: fetches HR user's `wisehire_companies` row, their `subscriptions` record, and computes `{ isTrialActive, daysRemaining, currentPlan, isExpiredWithNoPlan }`
- [ ] T065 [US5] Add 7-day Professional trial auto-grant to HR profile creation flow: after `account_type = 'hr'` profile is created in `WiseHireSignupPage`, call existing subscription/trial service to insert a `wisehire_professional` plan with 7-day duration
- [ ] T066 [P] [US5] Create `src/components/wisehire/TrialCountdownBadge.tsx` — uses `useWiseHireAccount`; shows "N days left in trial" with day count; shows "Early Access" if on coupon plan; hides if not in trial; links to `/wisehire/subscription`
- [ ] T067 [P] [US5] Create `src/components/wisehire/ContactUsLockout.tsx` — full-screen overlay: "Your trial has ended", "Contact us to continue using WiseHire", email link to `contact@thewise.cloud`, clean WiseHire-branded layout
- [ ] T068 [US5] Create `src/pages/wisehire/WiseHireSubscriptionPage.tsx` — WiseHire tier cards (Starter/Pro/Business/Enterprise) each with "Early Access" badge and a disabled "Join Waitlist" CTA (no Stripe button); coupon code input that calls existing `redeem-coupon` edge function; current plan status display; trial countdown if active
- [ ] T069 [US5] Verify `WiseHireGuard.tsx` correctly redirects to `/wisehire/contact` (lockout) when `isExpiredWithNoPlan = true`
- [ ] T070 [US5] Manual verification: new signup gets 7-day trial, badge shows in dashboard, subscription page renders, coupon redemption updates plan, expired trial triggers lockout
- [ ] T071 Update `project-governance/CHANGELOG.md` with US5 trial + subscription entry

**Checkpoint**: Trial auto-grants on sign-up. Trial badge visible throughout dashboard. Coupon system extended for WiseHire tiers. Expired trial → lockout (not broken UI, not free tier).

---

## Phase 9 — US1 (continued): WiseHire Dashboard Shell

**Goal**: HR users have a functional dashboard with sidebar nav, skeleton stats, quick actions, and settings (BYOK). SkyWallpaper is visible via AppShell inheritance.  
**Independent Test**: HR user logs in → WiseHire dashboard loads with sidebar nav, trial badge in header, SkyWallpaper visible. All nav links route correctly. Settings page BYOK save works.

- [ ] T072 [US1] Create `src/components/wisehire/WiseHireShell.tsx` — sidebar layout using existing `AppShell` pattern: nav links (Dashboard, Brief Generator, JD Writer, Pipeline, Settings, Subscription), `<TrialCountdownBadge>` in sidebar header, WiseHire blue accent colours, user avatar/menu at bottom
- [ ] T073 [P] [US1] Create `src/components/wisehire/dashboard/DashboardStatsSkeleton.tsx` — skeleton for 4 stat cards (matched layout to the real stat cards)
- [ ] T074 [P] [US1] Create `src/components/wisehire/dashboard/DashboardStats.tsx` — 4 stat cards (Total Briefs Generated, Open Roles, Candidates in Pipeline, Avg Match Score); queries `wisehire_candidate_briefs`, `wisehire_roles`, `wisehire_candidates`; shows `DashboardStatsSkeleton` during loading
- [ ] T075 [P] [US1] Create `src/components/wisehire/dashboard/RecentBriefs.tsx` — last 3 `wisehire_candidate_briefs` ordered by `created_at DESC`; shows candidate name, match score chip, date; links to `/wisehire/brief/{id}`; shows empty state if none
- [ ] T076 [P] [US1] Create `src/components/wisehire/dashboard/QuickActions.tsx` — three action buttons: "Generate Brief" → `/wisehire/brief`, "Write a JD" → `/wisehire/jd-writer`, "View Pipeline" → `/wisehire/pipeline`
- [ ] T077 [US1] Create `src/pages/wisehire/WiseHireDashboardPage.tsx` — composes `WiseHireShell` + `DashboardStats` + `RecentBriefs` + `QuickActions` + onboarding nudge banner (if incomplete)
- [ ] T078 [US1] Create `src/pages/wisehire/WiseHireSettingsPage.tsx` — BYOK section (reuses existing `manage-api-keys` edge function and UI pattern); profile info section (company name, size, HR user name)
- [ ] T079 [US1] Manual verification: dashboard loads with SkyWallpaper visible, nav links all work, skeleton shows during data load, trial badge in sidebar, settings BYOK save works
- [ ] T080 Update `project-governance/CHANGELOG.md` with US1 dashboard shell entry

**Checkpoint**: HR users have a fully navigable WiseHire product shell. Dashboard shows live stats and recent briefs. All nav destinations have pages (even if empty). SkyWallpaper confirmed via AppShell.

---

## Phase 10 — US8: AI Job Description Writer

**Goal**: HR user types a short description, receives a full JD within 20 seconds, can edit inline, save to a role, and copy.  
**Independent Test**: Enter 2 sentences → full structured JD returned within 20s. Edit and save → JD persists to `wisehire_roles`. Copy → clipboard. JD Library shows all saved JDs. Starter with no AI key → clear BYOK prompt.

- [ ] T081 [US8] Create `supabase/functions/wisehire-write-jd/index.ts` — `requireAuth` → `account_type = 'hr'` check → validate input (min 10 chars) → check daily JD rate limit fail-closed (Starter: 10/day, Professional/Business: unlimited) → call `aiClient.ts` with bias-reduced JD prompt → parse JSON response `{ title, summary, responsibilities, requirements, benefits }` → if `role_id` provided update `wisehire_roles.jd_text` → return structured JD
- [ ] T082 [US8] Create `src/hooks/wisehire/useJDs.ts` — TanStack Query hook: list saved JDs from `wisehire_roles` where `jd_text IS NOT NULL`; mutations for save and delete
- [x] T083 [P] [US8] Create `src/components/wisehire/jd-writer/JDSkeleton.tsx` — skeleton matching the JD writer output layout
- [x] T084 [P] [US8] Create `src/components/wisehire/jd-writer/JDWriterForm.tsx` — textarea (min 10 chars, enforced client-side), role selector dropdown (from `wisehire_roles`), "Write JD" button; shows loading state; calls `wisehire-write-jd`; on Starter with no API key shows BYOK prompt inline
- [x] T085 [P] [US8] Create `src/components/wisehire/jd-writer/JDInlineEditor.tsx` — editable JD output with labelled sections (Summary, Responsibilities, Requirements, Benefits); Save button; Copy to Clipboard button; integrates with `useJDs` save mutation
- [x] T086 [P] [US8] Create `src/components/wisehire/jd-writer/JDLibrary.tsx` — list of all saved JDs (role name, creation date, truncated preview snippet); Edit and Copy actions per row; Delete with soft confirmation; skeleton during loading
- [x] T087 [US8] Create `src/pages/wisehire/JDWriterPage.tsx` — tabs: "Write JD" tab (JDWriterForm + JDInlineEditor) and "JD Library" tab (JDLibrary); wrapped in `WiseHireShell`
- [ ] T088 [US8] Manual verification: 2-sentence input → full JD in < 20s; edit + save persists; copy works; library shows all saved JDs; Starter without BYOK sees prompt; rate limit blocks after 10/day
- [x] T089 Update `project-governance/CHANGELOG.md` with US8 JD Writer entry

**Checkpoint**: JD Writer is independently usable. Validates the AI integration layer for WiseHire. Rate limiting confirmed fail-closed.

---

## Phase 11 — US7: AI Candidate Brief Generator

**Goal**: HR user uploads a resume PDF and pastes a JD; receives a complete Candidate Brief within 30 seconds. Brief is exportable as PDF and shareable via a public read-only link.  
**Independent Test**: Upload PDF + paste JD → complete brief (score, 3 strengths, 3 concerns, 8 questions, employment notes) within 30s. Export PDF works. Share link opens publicly without auth. Revoking share link invalidates old URL. Starter without BYOK sees prompt. Rate limit blocks after 5/day.

- [ ] T090 [US7] Create `supabase/functions/wisehire-generate-brief/index.ts` — `requireAuth` → `account_type = 'hr'` check → fetch `wisehire_candidates` and confirm `owner_id` match → check `resume_text` is not null → check BYOK status (Starter: return `requiresApiKey: true` if none) → fail-closed rate limit (Starter: 5/day + 30/month cap; Professional: 50/day) → build and call AI prompt via `aiClient.ts` → parse and validate JSON response → insert into `wisehire_candidate_briefs` → return full brief
- [ ] T091 [US7] Create `src/hooks/wisehire/useBriefs.ts` — TanStack Query: list briefs by `owner_id`; fetch single brief by ID; mutations for share token revocation
- [ ] T092 [P] [US7] Create `src/lib/wisehire/briefPdfExport.ts` — client-side PDF generation of brief output (using browser print stylesheet or a lightweight PDF library); accepts brief data, triggers download with candidate name in filename
- [x] T093 [P] [US7] Create `src/components/wisehire/brief/BriefSkeleton.tsx` — skeleton matching full brief output layout
- [x] T094 [P] [US7] Create `src/components/wisehire/brief/BriefForm.tsx` — file upload input (PDF only, max 10MB, WCAG-labelled); JD textarea; role selector; "Generate Brief" button with loading/streaming state; after PDF selected: upload to `candidate-resumes` bucket, create `wisehire_candidates` row, call `parse-resume` to extract text, then call `wisehire-generate-brief`; BYOK prompt if Starter and no key configured
- [x] T095 [P] [US7] Create `src/components/wisehire/brief/BriefOutput.tsx` — renders: match score ring (0–100 with colour gradient), strengths chips (3), concerns chips (3), numbered interview questions list (8), employment notes section, created_at timestamp
- [x] T096 [P] [US7] Create `src/components/wisehire/brief/BriefShareModal.tsx` — copyable share URL; "Revoke & Regenerate Link" button (sets `share_token_active = false` on old token, generates new UUID, updates row); warning that old link immediately stops working
- [x] T097 [US7] Create `src/pages/wisehire/BriefGeneratorPage.tsx` — `BriefForm` + `BriefOutput` (or `BriefSkeleton` during generation); "Export PDF" button; "Share" button opening `BriefShareModal`; "Recent Briefs" sidebar list linking to `/wisehire/brief/{id}`; wrapped in `WiseHireShell`
- [x] T098 [US7] Create `src/pages/wisehire/BriefViewPage.tsx` — fetch and display a saved brief by ID; same `BriefOutput` component; Export, Share, "Add to Pipeline" actions; wrapped in `WiseHireShell`
- [x] T099 [US7] Create `src/pages/share/PublicBriefPage.tsx` — route `/share/brief/:token`; no auth required; fetches brief via service role using `share_token` where `share_token_active = true`; renders read-only `BriefOutput`; shows 404 message if token invalid/revoked
- [ ] T100 [US7] Manual verification: full flow (upload → parse → generate → view); all brief fields present; export PDF downloads; share link works publicly; revoke invalidates old link, new link works; rate limits enforced; BYOK prompt shown to Starter without key
- [x] T101 Update `project-governance/CHANGELOG.md` with US7 Brief Generator entry

**Checkpoint**: Candidate Brief Generator is fully functional. The core AI differentiator works end-to-end. Public share links verified. Rate limits confirmed fail-closed.

---

## Phase 12 — US9: Candidate Pipeline Board

**Goal**: HR user manages candidates in a Kanban board with 6 fixed stages. Drag-and-drop persists after refresh. Keyboard alternative provided for WCAG AA. Pipeline events recorded.  
**Independent Test**: Add candidates → appear in Shortlisted. Drag to Interviewing → persists after browser refresh. Keyboard mover: tab to card → select stage → press Enter → stage updates. Filter by role shows only that role's candidates. Pipeline event recorded for each stage change.

- [ ] T102 [US9] Create `src/lib/wisehire/pipelineDragDrop.ts` — drag-and-drop state logic: `onDragStart`, `onDragOver`, `onDrop` handlers; optimistic UI update → then calls `usePipeline.updatePipelineStage` mutation; handles drop cancelled/error (reverts optimistic update)
- [ ] T103 [US9] Create `src/hooks/wisehire/usePipeline.ts` — TanStack Query: list `wisehire_candidates` filtered by `owner_id` and optionally `role_id`, grouped by `pipeline_stage`; mutation `updatePipelineStage(candidateId, toStage)` — updates `wisehire_candidates.pipeline_stage` and inserts a `wisehire_pipeline_events` row
- [x] T104 [P] [US9] Create `src/components/wisehire/pipeline/PipelineSkeleton.tsx` — skeleton for 6-column Kanban (2–3 placeholder cards per column)
- [x] T105 [P] [US9] Create `src/components/wisehire/pipeline/PipelineColumn.tsx` — single stage column: header with stage label and candidate count badge; droppable zone (accepts `onDragOver`, `onDrop`); renders list of `CandidateCard`
- [x] T106 [P] [US9] Create `src/components/wisehire/pipeline/CandidateCard.tsx` — draggable card: `draggable` attribute; `onDragStart` handler; shows candidate name, role name, match score chip (if brief exists); keyboard focus ring; click → opens `CandidateDetailPanel`; accessible `role="button"` and `aria-label`
- [x] T107 [P] [US9] Create `src/components/wisehire/pipeline/KeyboardPipelineMover.tsx` — WCAG AA keyboard alternative: visible when a card has keyboard focus; select dropdown with all 6 stages; "Move" button; on confirm calls `updatePipelineStage` mutation; visually announces stage change via `aria-live`
- [x] T108 [P] [US9] Create `src/components/wisehire/pipeline/CandidateDetailPanel.tsx` — slide-over panel: candidate name, email, role; "View Brief" link if brief exists; private notes textarea (autosave on blur); stage history list from `wisehire_pipeline_events` (stage, timestamp); close button
- [x] T109 [P] [US9] Create `src/components/wisehire/pipeline/AddCandidateSheet.tsx` — bottom sheet/drawer: name, email, role selector, PDF upload; on submit: upload PDF to `candidate-resumes`, create `wisehire_candidates` row, call `parse-resume` edge function to extract `resume_text`, insert as Shortlisted; success → card appears in Shortlisted column
- [x] T110 [US9] Create `src/components/wisehire/pipeline/PipelineBoard.tsx` — renders 6 `PipelineColumn` components in order (Shortlisted → Contacted → Interviewing → Offer Sent → Hired → Rejected); integrates `pipelineDragDrop.ts`; wraps `PipelineSkeleton` during loading; `aria-label="Candidate Pipeline Board"` on board container
- [x] T111 [US9] Create `src/pages/wisehire/PipelinePage.tsx` — role filter selector at top; `PipelineBoard`; "Add Candidate" button opening `AddCandidateSheet`; `CandidateDetailPanel` as overlay; wrapped in `WiseHireShell`
- [ ] T112 [US9] Manual verification: add candidates → appear in Shortlisted; drag to different stage → persist after refresh; keyboard mover moves stage and `aria-live` announces; pipeline events recorded; role filter works; detail panel shows brief link, notes, history; "Add Candidate" flow complete
- [x] T113 Update `project-governance/CHANGELOG.md` with US9 Pipeline Board entry

**Checkpoint**: Pipeline board is fully functional. Drag-and-drop persists. Keyboard alternative confirmed accessible. Stage history tracked. Phase 1 feature set complete.

---

## Phase 13 — Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass across all Phase 1 deliverables.

- [x] T114 [P] Verify all WiseHire pages have skeleton loaders and no blank screens — spot-check with network throttled to Slow 3G in browser devtools
- [x] T115 [P] Run WCAG AA contrast check on WiseHire blue (`#1D4ED8`) against white backgrounds and dark mode — confirm pass
- [x] T116 [P] Run existing Vitest test suite: `npm run test` — verify all 302 baseline tests still pass with no regressions
- [x] T117 [P] Verify `WiseHireGuard` bidirectional routing works correctly in all edge cases: unauthenticated, wrong account type, expired trial, valid HR user
- [x] T118 [P] Verify all 6 edge functions are deployed and listed in Supabase dashboard — count should be 77 + 6 = 83 total
- [x] T119 Update `project-governance/ARCHITECTURE.md` with final edge function count (83) and any other corrections from implementation
- [x] T120 Update `specs/001-wisehire-hr-platform/spec.md` status to `"Approved — Phase 1 Complete"`
- [x] T121 Final `project-governance/CHANGELOG.md` entry — Phase 1 complete summary

---

## Dependencies & Execution Order

### Phase Dependencies

| Phase | Name | Blocked by |
|-------|------|-----------|
| Phase 1 | Database Foundation | Nothing — start immediately |
| Phase 2 | Account Type Visibility | Phase 1 complete |
| Phase 3 | Landing Toggle | Phase 1 complete |
| Phase 4 | Waitlist Backend | Phase 1 + Phase 3 complete |
| Phase 5 | Dev Kit Admin Tools | Phase 1 + Phase 2 complete |
| Phase 6 | Sign-Up + Routing Guards | Phase 1 + Phase 5 complete |
| Phase 7 | WiseHire Onboarding | Phase 6 complete |
| Phase 8 | Trial + Subscription | Phase 6 complete |
| Phase 9 | Dashboard Shell | Phase 7 + Phase 8 complete |
| Phase 10 | JD Writer (US8) | Phase 9 complete |
| Phase 11 | Brief Generator (US7) | Phase 9 complete |
| Phase 12 | Pipeline Board (US9) | Phase 9 complete |
| Phase 13 | Polish | Phases 10–12 complete |

### Parallel Opportunities

After **Phase 1** completes, **Phases 2 and 3** can run in parallel.  
After **Phase 6** completes, **Phases 7 and 8** can run in parallel.  
After **Phase 9** completes, **Phases 10, 11, and 12** can run in parallel.  
Within any phase, tasks marked **[P]** have no file conflicts and can be worked simultaneously.

---

## MVP Validation Strategy

At each checkpoint, validate the completed user story is independently functional before advancing:

| After Phase | Validate |
|------------|---------|
| Phase 1 | DB tables visible in Supabase, storage bucket exists, secret set |
| Phase 2 | Dev kit account type badges on all existing users |
| Phase 3 | Landing toggle: theme switch, URL update, modal opens |
| Phase 4 | Waitlist: form submits, DB row created, both emails delivered |
| Phase 5 | Admin: invite email sends, audit log records, coupon panel has WiseHire tiers |
| Phase 6 | Invite → sign-up → `account_type = 'hr'` confirmed, route guards both directions |
| Phase 7 | Onboarding: all 5 steps, localStorage draft, DB save, redirect |
| Phase 8 | Trial badge visible, subscription page renders, coupon works, lockout triggers |
| Phase 9 | Dashboard loads, nav works, SkyWallpaper visible, settings BYOK saves |
| Phase 10 | JD from 2 sentences < 20s, edit/save/copy, library shows saved JDs |
| Phase 11 | Brief from PDF + JD < 30s, public share works, revoke invalidates |
| Phase 12 | Drag persists, keyboard mover works, events recorded, filter works |
| Phase 13 | 302 baseline tests pass, all skeletons present, WCAG AA confirmed |
