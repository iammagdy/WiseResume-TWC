# Implementation Plan: WiseHire Phase 1

**Branch**: `001-wisehire-hr-platform` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification `specs/001-wisehire-hr-platform/spec.md` — 15 user stories, 66 FRs, 20 gap resolutions

---

## Summary

WiseHire is a new AI-powered HR SaaS product built into the existing WiseResume codebase. Phase 1 adds: a landing page toggle with full WiseHire theme switching, a waitlist system (pre-launch gate), account type split (`job_seeker` | `hr` on `profiles`), an invite-only HR sign-up flow via HMAC-signed tokens, a 5-step HR onboarding, a 7-day Professional trial auto-grant, WiseHire-specific admin dev kit tools, an AI Candidate Brief Generator, an AI Job Description Writer, and a Kanban Pipeline Board.

The two products share all infrastructure (Kinde auth, Supabase DB, AI layer, Resend email, admin dev kit, AppShell/SkyWallpaper). They are separated permanently at the data layer by `profiles.account_type`.

---

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + edge functions)  
**Frontend**: React 18 + Vite + Tailwind CSS + Shadcn/UI + Framer Motion  
**Backend**: Supabase Edge Functions (Deno runtime)  
**Database**: Supabase PostgreSQL with RLS — SQL migrations in `supabase/migrations/`  
**Migration Workflow**: Write SQL migration files in `supabase/migrations/`, apply via `npx supabase db push`  
**Auth**: Kinde → Supabase Token Bridge (existing; no changes)  
**AI Layer**: `_shared/aiClient.ts` (existing; reused verbatim)  
**PDF Parsing**: `parse-resume` edge function (existing; reused verbatim)  
**Email**: Resend via `admin-email-actions` edge function + React Email templates in `_shared/email-templates/`  
**Storage**: Supabase Storage — new `candidate-resumes` bucket  
**State**: Zustand + TanStack Query (existing patterns, extended for WiseHire)  
**Testing**: Vitest (302 tests baseline — WiseHire unit tests to be added)  
**Target Platform**: Web (desktop-first Phase 1/2 — documented exception per Decision #8)  
**Performance Goals**: Landing toggle < 400ms. Brief generation < 30s. JD generation < 20s.  
**Constraints**: No Stripe/payments. No multi-seat (Phase 4). No mobile optimisation (Phase 3). WCAG AA mandatory.  
**Scale/Scope**: First 10 invited HR users. 7 new tables. 6 new edge functions. 10+ new pages.

> **Important note on schema migrations**: The spec (FR-048) references `npm run db:push` and `shared/schema.ts`. These do not exist in the codebase. The actual workflow is SQL migration files in `supabase/migrations/` applied via `npx supabase db push`. All new table definitions are written as SQL migration files, not in a schema.ts.

---

## Constitution Check

*All 66 FRs checked against project-governance/ rules.*

| Rule | Status | Notes |
|------|--------|-------|
| Kinde auth (`requireAuth`) on all protected routes | ✅ PASS | All `/wisehire/*` routes wrap `requireAuth`. Public routes (`/share/brief/:token`, `/share/scorecard/:token`, waitlist form) do NOT require auth. |
| RLS on all new tables | ✅ PASS | All 7 new WiseHire tables have explicit RLS. See Section 5. |
| `botGuard` on all public edge functions | ✅ PASS | All 2 public edge functions (`wisehire-waitlist-join`, `wisehire-validate-invite`) use `botGuard.ts`. No `requireAuth` on these. |
| Fail-closed rate limiting on all AI edge functions | ✅ PASS | `wisehire-generate-brief` and `wisehire-write-jd` use fail-closed limiter (consistent with Decision #6). |
| Changelog discipline | ✅ PASS | Build steps include CHANGELOG.md updates. |
| Soft-delete for candidates / Talent Pool | ✅ PASS | `wisehire_candidates` has `is_deleted = false` filter. Hard delete after 30-day post-cancellation period only. |
| SkyWallpaper in WiseHire dashboard | ✅ PASS | WiseHire pages use existing `AppShell` — SkyWallpaper inherited automatically. |
| WCAG AA accessibility | ✅ PASS | Pipeline drag-and-drop has keyboard alt. All form inputs have labels. Blue palette passes AA contrast. |
| No blank screens (skeleton loaders) | ✅ PASS | Every WiseHire data view has a dedicated skeleton component. |
| No fake intelligence / placeholder data | ✅ PASS | AI edge functions call real AI via `aiClient.ts`. No mock scores. |
| Soft-delete default (Decision #5) | ✅ PASS | Candidates use `is_deleted`. Hard delete only after 30-day window. |
| `account_type` routing enforcement | ✅ PASS | Route guards in `src/components/wisehire/WiseHireGuard.tsx`. Both directions (HR blocked from job seeker routes, vice versa). |
| No free tier (post-trial lockout) | ✅ PASS | Trial expiry → `ContactUsLockoutPage` for HR accounts. |
| Desktop-first documented exception | ✅ PASS | Decision #8. Phase 3 mobile work tracked. |
| Invite tokens (HMAC-SHA256, 72hr expiry) | ✅ PASS | Implemented in `wisehire_invites` table + `admin-wisehire-invite` function. |
| Candidate PDFs in `candidate-resumes` bucket | ✅ PASS | Bucket RLS restricts to owning HR user. |
| `account_type` immutable post-signup | ✅ PASS | Set by edge function on profile creation. No UI to change it. No admin update path for this field. |

**No violations. All 66 FRs pass constitution check.**

FR mapping note: FR-049 (RLS on all WiseHire tables), FR-062 (desktop-first exception), FR-063 (post-trial lockout), FR-064 (invite token mechanism), FR-065 (candidate PDF storage), FR-066 (WiseHire rate limits), FR-067 (dev kit waitlist panel), FR-068 (share token revocation), FR-069 (WCAG AA), FR-070 (skeleton loaders) — all addressed in this plan.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-wisehire-hr-platform/
├── spec.md              # Approved spec (DO NOT MODIFY without user approval)
└── plan.md              # This file
```

### Source Code Layout

```text
src/
├── pages/
│   ├── wisehire/
│   │   ├── WiseHireDashboardPage.tsx       # NEW — Main WiseHire dashboard
│   │   ├── WiseHireOnboardingPage.tsx       # NEW — 5-step HR onboarding
│   │   ├── WiseHireSubscriptionPage.tsx     # NEW — WiseHire plan management
│   │   ├── WiseHireSettingsPage.tsx         # NEW — WiseHire settings (BYOK, profile)
│   │   ├── BriefGeneratorPage.tsx           # NEW — AI Candidate Brief generator
│   │   ├── BriefViewPage.tsx                # NEW — View a saved brief (/wisehire/brief/:id)
│   │   ├── JDWriterPage.tsx                 # NEW — AI Job Description writer
│   │   └── PipelinePage.tsx                 # NEW — Candidate pipeline board
│   ├── share/
│   │   ├── PublicBriefPage.tsx              # NEW — Public read-only brief (/share/brief/:token)
│   │   └── PublicScorecardPage.tsx          # NEW — Public read-only scorecard (Phase 2)
│   └── WaitlistPage.tsx                     # NEW — Standalone waitlist success/confirmation
│
├── components/
│   ├── wisehire/
│   │   ├── WiseHireGuard.tsx                # NEW — Route guard (account_type=hr required)
│   │   ├── WiseHireShell.tsx                # NEW — WiseHire sidebar nav layout
│   │   ├── TrialCountdownBadge.tsx          # NEW — Trial days remaining badge
│   │   ├── ContactUsLockout.tsx             # NEW — Post-trial lockout screen
│   │   │
│   │   ├── brief/
│   │   │   ├── BriefForm.tsx                # NEW — Resume upload + JD paste form
│   │   │   ├── BriefOutput.tsx              # NEW — Rendered brief (score, strengths, Qs)
│   │   │   ├── BriefSkeleton.tsx            # NEW — Loading skeleton for brief
│   │   │   └── BriefShareModal.tsx          # NEW — Share link + revoke controls
│   │   │
│   │   ├── jd-writer/
│   │   │   ├── JDWriterForm.tsx             # NEW — Short input → full JD
│   │   │   ├── JDInlineEditor.tsx           # NEW — Editable JD output
│   │   │   ├── JDLibrary.tsx                # NEW — Saved JDs list
│   │   │   └── JDSkeleton.tsx               # NEW — Loading skeleton
│   │   │
│   │   ├── pipeline/
│   │   │   ├── PipelineBoard.tsx            # NEW — Kanban board wrapper
│   │   │   ├── PipelineColumn.tsx           # NEW — Single stage column
│   │   │   ├── CandidateCard.tsx            # NEW — Card with drag handle
│   │   │   ├── CandidateDetailPanel.tsx     # NEW — Slide-over: brief, notes, history
│   │   │   ├── KeyboardPipelineMover.tsx    # NEW — Keyboard-accessible stage mover (WCAG AA)
│   │   │   ├── AddCandidateSheet.tsx        # NEW — Add candidate form (upload or manual)
│   │   │   └── PipelineSkeleton.tsx         # NEW — Loading skeleton
│   │   │
│   │   └── dashboard/
│   │       ├── DashboardStats.tsx           # NEW — Brief count, role count, pipeline counts
│   │       ├── DashboardStatsSkeleton.tsx   # NEW — Skeleton for stats
│   │       ├── RecentBriefs.tsx             # NEW — Last 3 generated briefs
│   │       └── QuickActions.tsx             # NEW — "Generate Brief", "Write JD", "View Pipeline"
│   │
│   ├── landing/
│   │   ├── LandingToggle.tsx                # NEW — "For Job Seekers" / "For Companies" toggle
│   │   ├── wisehire/
│   │   │   ├── WiseHireHero.tsx             # NEW — WiseHire hero section
│   │   │   ├── WiseHireFeatures.tsx         # NEW — 5 WiseHire pillars
│   │   │   ├── WiseHirePricing.tsx          # NEW — WiseHire pricing (Early Access)
│   │   │   ├── WiseHireDemoSection.tsx      # NEW — Animated demos (brief, pipeline, JD)
│   │   │   ├── BriefDemo.tsx                # NEW — Brief Generator demo animation
│   │   │   ├── PipelineDemo.tsx             # NEW — Pipeline board demo animation
│   │   │   └── JDDemo.tsx                   # NEW — JD Writer demo animation
│   │   └── WaitlistModal.tsx                # NEW — Waitlist form modal/drawer
│   │
│   └── dev-kit/
│       └── WiseHireWaitlistPanel.tsx        # NEW — Waitlist entries + Invite button
│
├── hooks/
│   └── wisehire/
│       ├── useWiseHireAccount.ts            # NEW — HR account data, trial status
│       ├── useBriefs.ts                     # NEW — TanStack Query for briefs CRUD
│       ├── useJDs.ts                        # NEW — TanStack Query for JDs CRUD
│       ├── usePipeline.ts                   # NEW — TanStack Query for pipeline/candidates
│       └── useWaitlist.ts                   # NEW — Waitlist submission hook
│
├── lib/
│   └── wisehire/
│       ├── pipelineDragDrop.ts              # NEW — Drag-and-drop logic (no external lib)
│       ├── briefPdfExport.ts                # NEW — Client-side brief PDF generation
│       └── inviteTokenClient.ts             # NEW — Invite token validation helper

supabase/
├── migrations/
│   ├── 20260415000001_wisehire_account_type.sql      # NEW — profiles.account_type column
│   ├── 20260415000002_wisehire_waitlist.sql           # NEW — wisehire_waitlist table + RLS
│   ├── 20260415000003_wisehire_invites.sql            # NEW — wisehire_invites table + RLS
│   ├── 20260415000004_wisehire_companies.sql          # NEW — wisehire_companies table + RLS
│   ├── 20260415000005_wisehire_roles.sql              # NEW — wisehire_roles table + RLS
│   ├── 20260415000006_wisehire_candidates.sql         # NEW — wisehire_candidates table + RLS
│   ├── 20260415000007_wisehire_candidate_briefs.sql   # NEW — wisehire_candidate_briefs + RLS
│   └── 20260415000008_wisehire_pipeline_events.sql    # NEW — wisehire_pipeline_events + RLS
│
└── functions/
    ├── wisehire-waitlist-join/
    │   └── index.ts                         # NEW — Public: submit waitlist entry + send emails
    ├── wisehire-validate-invite/
    │   └── index.ts                         # NEW — Public: validate HMAC-signed invite token
    ├── wisehire-generate-brief/
    │   └── index.ts                         # NEW — Auth+HR: AI Candidate Brief generator
    ├── wisehire-write-jd/
    │   └── index.ts                         # NEW — Auth+HR: AI Job Description writer
    ├── admin-wisehire-waitlist/
    │   └── index.ts                         # NEW — Admin: list waitlist entries
    ├── admin-wisehire-invite/
    │   └── index.ts                         # NEW — Admin: generate + send HMAC invite
    └── _shared/
        └── email-templates/
            ├── wisehire-invite.tsx           # NEW — Branded WiseHire invite email
            ├── wisehire-waitlist-confirmation.tsx  # NEW — Confirmation to submitter
            └── wisehire-waitlist-notification.tsx  # NEW — Admin notification email
```

---

## Database Tables — Full Schema + RLS

All migrations go in `supabase/migrations/`. Apply via `npx supabase db push`. Never write raw SQL by hand without a migration file.

### Migration 1: `profiles.account_type` column

**File**: `supabase/migrations/20260415000001_wisehire_account_type.sql`

```sql
-- Add account_type to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'job_seeker'
  CHECK (account_type IN ('job_seeker', 'hr'));

-- Backfill all existing profiles as job_seeker (already default)
UPDATE public.profiles SET account_type = 'job_seeker' WHERE account_type IS NULL;
```

**RLS Impact**: No new RLS policy needed — existing `profiles` RLS applies. The `account_type` column is set at profile creation by the `token-exchange` or HR sign-up edge function and is not updatable by the user directly.

---

### Migration 2: `wisehire_waitlist`

**File**: `supabase/migrations/20260415000002_wisehire_waitlist.sql`

```sql
CREATE TABLE public.wisehire_waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  company_name  TEXT NOT NULL,
  company_size  TEXT NOT NULL,           -- e.g. '1-10', '11-50', '51-200', '200+'
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_at    TIMESTAMPTZ,             -- set when admin sends invite
  notes         TEXT                     -- admin notes
);

-- RLS: waitlist entries are admin-only. No user can read/write this table.
ALTER TABLE public.wisehire_waitlist ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policy. Accessed only via admin edge functions
-- using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
```

---

### Migration 3: `wisehire_invites`

**File**: `supabase/migrations/20260415000003_wisehire_invites.sql`

```sql
CREATE TABLE public.wisehire_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT NOT NULL UNIQUE,          -- UUID v4 (random part)
  token_signature TEXT NOT NULL,                 -- HMAC-SHA256 signature
  recipient_email TEXT NOT NULL,
  created_by      UUID REFERENCES public.profiles(id),  -- admin user
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,          -- 72 hours from created_at
  used_at         TIMESTAMPTZ,                   -- null = unused
  is_revoked      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX wisehire_invites_token_idx ON public.wisehire_invites (token);
CREATE INDEX wisehire_invites_email_idx ON public.wisehire_invites (recipient_email);

-- RLS: admin-only. No user-facing access.
ALTER TABLE public.wisehire_invites ENABLE ROW LEVEL SECURITY;
-- Accessed only via service role key in edge functions.
```

---

### Migration 4: `wisehire_companies`

**File**: `supabase/migrations/20260415000004_wisehire_companies.sql`

```sql
CREATE TABLE public.wisehire_companies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  size            TEXT NOT NULL,    -- '1-10', '11-50', '51-200', '200+'
  role_types      TEXT[],           -- e.g. ['engineering', 'sales', 'design']
  monthly_volume  TEXT,             -- e.g. '1-5', '6-20', '21-50', '50+'
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wisehire_companies ENABLE ROW LEVEL SECURITY;

-- HR user can read/write their own company record only
CREATE POLICY "HR user owns their company"
  ON public.wisehire_companies
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

---

### Migration 5: `wisehire_roles`

**File**: `supabase/migrations/20260415000005_wisehire_roles.sql`

```sql
CREATE TABLE public.wisehire_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.wisehire_companies(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  jd_text         TEXT,                          -- full job description text
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'closed')),
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wisehire_roles_owner_idx ON public.wisehire_roles (owner_id) WHERE is_deleted = false;

ALTER TABLE public.wisehire_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR user owns their roles"
  ON public.wisehire_roles
  FOR ALL
  USING (owner_id = auth.uid() AND is_deleted = false)
  WITH CHECK (owner_id = auth.uid());
```

---

### Migration 6: `wisehire_candidates`

**File**: `supabase/migrations/20260415000006_wisehire_candidates.sql`

```sql
CREATE TABLE public.wisehire_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id         UUID REFERENCES public.wisehire_roles(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  resume_pdf_path TEXT,              -- Supabase Storage path: {owner_id}/{id}/{filename}.pdf
  resume_text     TEXT,              -- Parsed resume text (from parse-resume edge function)
  pipeline_stage  TEXT NOT NULL DEFAULT 'shortlisted'
                  CHECK (pipeline_stage IN ('shortlisted', 'contacted', 'interviewing',
                                            'offer_sent', 'hired', 'rejected')),
  notes           TEXT,              -- Private HR notes
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wisehire_candidates_owner_idx ON public.wisehire_candidates (owner_id) WHERE is_deleted = false;
CREATE INDEX wisehire_candidates_role_idx  ON public.wisehire_candidates (role_id)  WHERE is_deleted = false;

ALTER TABLE public.wisehire_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR user owns their candidates"
  ON public.wisehire_candidates
  FOR ALL
  USING (owner_id = auth.uid() AND is_deleted = false)
  WITH CHECK (owner_id = auth.uid());
```

---

### Migration 7: `wisehire_candidate_briefs`

**File**: `supabase/migrations/20260415000007_wisehire_candidate_briefs.sql`

```sql
CREATE TABLE public.wisehire_candidate_briefs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id        UUID NOT NULL REFERENCES public.wisehire_candidates(id) ON DELETE CASCADE,
  role_id             UUID REFERENCES public.wisehire_roles(id) ON DELETE SET NULL,
  match_score         INTEGER CHECK (match_score BETWEEN 0 AND 100),
  strengths           TEXT[],         -- exactly 3 items
  concerns            TEXT[],         -- exactly 3 items
  interview_questions TEXT[],         -- exactly 8 items
  employment_notes    TEXT,           -- tenure, gaps, trajectory
  ai_model_used       TEXT,           -- e.g. 'groq/llama-3', 'openai/gpt-4o'
  is_byok             BOOLEAN NOT NULL DEFAULT false,
  share_token         UUID UNIQUE DEFAULT gen_random_uuid(),   -- public share link token
  share_token_active  BOOLEAN NOT NULL DEFAULT true,           -- false = revoked
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wisehire_briefs_owner_idx     ON public.wisehire_candidate_briefs (owner_id);
CREATE INDEX wisehire_briefs_candidate_idx ON public.wisehire_candidate_briefs (candidate_id);
CREATE INDEX wisehire_briefs_token_idx     ON public.wisehire_candidate_briefs (share_token) WHERE share_token_active = true;

ALTER TABLE public.wisehire_candidate_briefs ENABLE ROW LEVEL SECURITY;

-- Authenticated HR user: own briefs only
CREATE POLICY "HR user owns their briefs"
  ON public.wisehire_candidate_briefs
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public share: anyone can read an active share token (no auth required)
-- This is enforced in the edge function, NOT via RLS (anon access is service role).
```

---

### Migration 8: `wisehire_pipeline_events`

**File**: `supabase/migrations/20260415000008_wisehire_pipeline_events.sql`

```sql
CREATE TABLE public.wisehire_pipeline_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES public.wisehire_candidates(id) ON DELETE CASCADE,
  from_stage      TEXT,              -- null for initial placement
  to_stage        TEXT NOT NULL,
  moved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  moved_by        UUID REFERENCES public.profiles(id)
);

CREATE INDEX wisehire_pipeline_events_candidate_idx ON public.wisehire_pipeline_events (candidate_id);

ALTER TABLE public.wisehire_pipeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR user owns their pipeline events"
  ON public.wisehire_pipeline_events
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
```

---

## Supabase Storage — `candidate-resumes` Bucket

**Bucket name**: `candidate-resumes`  
**Access**: Private (no public access)  
**File path convention**: `{hr_user_id}/{candidate_id}/{sanitised-filename}.pdf`  
**Max file size**: 10MB per PDF  
**Allowed MIME types**: `application/pdf` only

**RLS policies** (set via Supabase dashboard or migration):
```sql
-- INSERT: HR user can upload to their own path
CREATE POLICY "HR user can upload candidate resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'candidate-resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT: HR user can read their own path only
CREATE POLICY "HR user can read their candidate resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'candidate-resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: HR user can delete their own files only
CREATE POLICY "HR user can delete their candidate resumes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'candidate-resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## Edge Functions — Full Specification

All edge functions follow the existing pattern: Deno runtime, `cors.ts` headers, JSON response. Auth functions use `requireAuth` from `_shared/authMiddleware.ts`. Public functions use `botGuard` from `_shared/botGuard.ts`.

---

### 1. `wisehire-waitlist-join` (PUBLIC)

**Purpose**: Accept a waitlist submission, store it, send two emails (confirmation + admin notification).  
**Auth**: None (public). Uses `botGuard` only.  
**Method**: POST

**Request body**:
```json
{
  "name": "string",
  "email": "string",
  "company_name": "string",
  "company_size": "string"  // enum: "1-10" | "11-50" | "51-200" | "200+"
}
```

**Validation**: All fields required. Email must be valid format. Rate limit: 3 submissions per IP per hour (via `checkIpRateLimit`).

**Behavior**:
1. `botGuard` — reject malicious bots with 403
2. Validate all fields present and email format valid
3. Check for duplicate email in `wisehire_waitlist` — if exists, return 200 with "already on the list" message (no duplicate created)
4. Insert into `wisehire_waitlist` via service role client
5. Send `wisehire-waitlist-confirmation.tsx` email to submitter via Resend
6. Send `wisehire-waitlist-notification.tsx` email to `contact@thewise.cloud` via Resend
7. Return `{ success: true, message: "You're on the list. We'll be in touch." }`

**Error handling**: Email send failures are logged but do NOT cause a 500 — the submission is still saved. Both email failures are logged separately.

---

### 2. `wisehire-validate-invite` (PUBLIC)

**Purpose**: Validate an invite token before sign-up — checks signature, expiry, and single-use.  
**Auth**: None (public). Uses `botGuard`.  
**Method**: POST

**Request body**:
```json
{ "token": "string" }
```

**Behavior**:
1. `botGuard`
2. Look up token in `wisehire_invites`
3. Verify HMAC-SHA256 signature using `WISEHIRE_INVITE_SECRET` env var
4. Check `expires_at > now()`
5. Check `used_at IS NULL` and `is_revoked = false`
6. If all pass: return `{ valid: true, recipient_email: "..." }`
7. If any fail: return `{ valid: false, reason: "expired"|"used"|"invalid" }`
8. Does NOT mark token as used — that happens during actual sign-up

---

### 3. `wisehire-generate-brief` (AUTHENTICATED + HR ONLY)

**Purpose**: Generate an AI Candidate Brief from parsed resume text + JD text.  
**Auth**: `requireAuth` + `account_type = 'hr'` check.  
**Method**: POST  
**Rate limiting**: Fail-closed (Decision #6). Per-tier daily limits enforced.

**Request body**:
```json
{
  "candidate_id": "uuid",
  "jd_text": "string",
  "role_id": "uuid | null"
}
```

**Behavior**:
1. `requireAuth` — verify JWT, get `user_id`
2. Fetch profile, confirm `account_type = 'hr'` (403 if not)
3. Fetch `wisehire_candidates` row — confirm `owner_id = user_id`
4. Check `resume_text` is not null — 400 if candidate has no parsed resume
5. Check WiseHire daily brief limit for user's tier (fail-closed on DB error)
   - Starter: 5/day (30/month cap checked separately)
   - Professional: 50/day
   - Business: unlimited
6. Check BYOK status — if Starter tier and no AI key configured, return `{ requiresApiKey: true }` (429-ish)
7. Build AI prompt (see below) and call `aiClient.ts`
8. Parse AI response — validate all required fields present
9. Insert into `wisehire_candidate_briefs`
10. Return full brief object

**AI Prompt structure** (system + user):
```
System: You are an expert recruiter. Analyse the candidate's resume against the job description.
Output ONLY valid JSON with this structure: {
  "match_score": 0-100,
  "strengths": ["...", "...", "..."],
  "concerns": ["...", "...", "..."],
  "interview_questions": ["q1","q2","q3","q4","q5","q6","q7","q8"],
  "employment_notes": "..."
}
Be specific to this candidate. Do not use generic language.

User: JOB DESCRIPTION:\n{jd_text}\n\nCANDIDATE RESUME:\n{resume_text}
```

**Fail-closed behavior**: If the rate limiter DB is unreachable → return 503. Never pass through.

---

### 4. `wisehire-write-jd` (AUTHENTICATED + HR ONLY)

**Purpose**: Generate a full Job Description from a short plain-English input.  
**Auth**: `requireAuth` + `account_type = 'hr'` check.  
**Method**: POST  
**Rate limiting**: Fail-closed. Starter: 10 JD generations/day.

**Request body**:
```json
{
  "role_description": "string",   // minimum 10 chars, 2 sentences recommended
  "role_id": "uuid | null"        // optional — if provided, saves JD to role
}
```

**Behavior**:
1. `requireAuth` + `account_type = 'hr'` check
2. Validate `role_description` length (min 10 chars)
3. Check daily JD limit (fail-closed)
4. Call `aiClient.ts` with JD generation prompt
5. Parse response — extract `{ title, summary, responsibilities, requirements, benefits }`
6. If `role_id` provided: update `wisehire_roles.jd_text` with generated JD
7. Return structured JD

**AI Prompt**:
```
System: You are an expert HR professional. Write a complete, professional, bias-reduced job description.
Output ONLY valid JSON: {
  "title": "string",
  "summary": "string",
  "responsibilities": ["...", ...],
  "requirements": ["...", ...],
  "benefits": ["...", ...]
}
Avoid gendered language. Be specific and clear.

User: {role_description}
```

---

### 5. `admin-wisehire-waitlist` (ADMIN ONLY)

**Purpose**: List all waitlist entries for the dev kit WiseHire Waitlist Panel.  
**Auth**: `adminAuth.ts` (existing admin auth middleware).  
**Method**: GET

**Query params**: `?page=1&limit=20&search=email_or_name`

**Response**:
```json
{
  "entries": [
    {
      "id": "uuid",
      "name": "...",
      "email": "...",
      "company_name": "...",
      "company_size": "...",
      "submitted_at": "ISO8601",
      "invited_at": "ISO8601 | null",
      "notes": "string | null"
    }
  ],
  "total": 42,
  "page": 1
}
```

---

### 6. `admin-wisehire-invite` (ADMIN ONLY)

**Purpose**: Generate a signed invite token and send a branded WiseHire invite email.  
**Auth**: `adminAuth.ts`.  
**Method**: POST

**Request body**:
```json
{
  "recipient_email": "string",
  "waitlist_id": "uuid | null"   // if from waitlist, marks it as invited
}
```

**Behavior**:
1. `adminAuth` middleware
2. Validate `recipient_email` format
3. Generate `token = UUID v4`
4. Compute `token_signature = HMAC-SHA256(token, WISEHIRE_INVITE_SECRET)`
5. Insert into `wisehire_invites`:
   - `token`, `token_signature`, `recipient_email`, `created_by = admin_user_id`
   - `expires_at = now() + 72 hours`
6. Construct invite URL: `https://thewise.cloud/wisehire/signup?invite={token}`
7. Send `wisehire-invite.tsx` email via Resend
8. If `waitlist_id` provided: update `wisehire_waitlist.invited_at = now()`
9. Insert audit log entry: `{ action: 'wisehire_invite_sent', actor: admin_user_id, target: recipient_email }`
10. Return `{ success: true, invite_url: "...", expires_at: "..." }`

**Environment variables required**: `WISEHIRE_INVITE_SECRET` (new secret — HMAC signing key)

---

## Email Templates

All templates live in `supabase/functions/_shared/email-templates/` as React Email TSX components. Follow the pattern of existing templates (e.g., `invite.tsx`, `magic-link.tsx`).

### `wisehire-invite.tsx`

**To**: HR professional receiving the invite  
**Subject**: "You're invited to WiseHire — AI-powered hiring tools"  
**Content**:
- WiseHire branded header (blue `#1D4ED8` palette)
- "You've been invited to join WiseHire" headline
- Brief product value prop (2–3 sentences)
- Large CTA button: "Accept Invite & Set Up Your Account" → `invite_url`
- Expiry notice: "This link expires in 72 hours."
- Footer: "If you didn't request this, you can safely ignore this email."

### `wisehire-waitlist-confirmation.tsx`

**To**: Person who joined the waitlist  
**Subject**: "You're on the WiseHire waitlist!"  
**Content**:
- WiseHire blue header
- "Thanks for joining, {name}!" headline
- Confirmation: "You're on the list for {company_name}. We'll be in touch soon."
- What to expect next (1–2 sentences)
- "Already have an account?" → Log In link

### `wisehire-waitlist-notification.tsx`

**To**: `contact@thewise.cloud`  
**Subject**: "New WiseHire Waitlist Signup: {company_name}"  
**Content**:
- Plain-text-style internal notification
- Name, Email, Company Name, Company Size
- Submitted At timestamp
- Quick "View in Dev Kit" link → dev kit URL

---

## Modified Files — Exact Changes

### `src/pages/Index.tsx`
- Add URL param detection: `?for=companies` → sets `mode = 'wisehire'` state
- Add `LandingToggle` component above the nav (highest z-index)
- Conditionally render: WiseResume sections (default) vs WiseHire sections (`mode === 'wisehire'`)
- `data-lp-scheme` attribute on root: switches between `'default'` and `'wisehire'`
- `--lp-brand` CSS var: `#9E1B22` (WiseResume) or `#1D4ED8` (WiseHire) based on mode
- Transition duration: 350ms on all `--lp-*` CSS var changes (under the 400ms spec requirement)
- Update `<meta>` tags dynamically when mode switches (OG title, description)
- URL update: `history.pushState({}, '', mode === 'wisehire' ? '/?for=companies' : '/')`

### `src/App.tsx`
- Add WiseHire lazy imports: `WiseHireDashboardPage`, `WiseHireOnboardingPage`, etc.
- Add WiseHire route group — all wrapped in `<WiseHireGuard>`:
  ```
  /wisehire/dashboard
  /wisehire/onboarding
  /wisehire/brief
  /wisehire/brief/:id
  /wisehire/jd-writer
  /wisehire/pipeline
  /wisehire/subscription
  /wisehire/settings
  ```
- Add public share routes (no auth guard):
  ```
  /share/brief/:token
  /share/scorecard/:token
  ```
- Add WiseHire sign-up route: `/wisehire/signup?invite={token}`
- Add post-trial lockout redirect: HR users with expired trial → `/wisehire/contact`

### `src/components/dev-kit/OverviewPanel.tsx`
- Add query for HR account count: `profiles` filtered by `account_type = 'hr'`
- Add query for job seeker count: `profiles` filtered by `account_type = 'job_seeker'`
- Add two new stat cards: "HR Accounts" (blue) and "Job Seekers" (existing crimson)

### `src/components/dev-kit/AdminUsersPanel.tsx`
- Add `account_type` to user list query
- Render `<DevKitBadges.AccountType type={user.account_type} />` on every user row

### `src/components/dev-kit/UserDetailDrawer.tsx`
- Add `account_type` field in the user details section (prominently, near top after name/email)
- Use the same `AccountType` badge component

### `src/components/dev-kit/CouponsPanel.tsx`
- Add WiseHire tier options to the plan selector:
  `wisehire_starter`, `wisehire_professional`, `wisehire_business`
- Group under "WiseHire Tiers" label in the select dropdown

### `src/components/dev-kit/EmailManagementPanel.tsx`
- Add "Send WiseHire Invite" as a new action type option
- When selected: show an email input field (pre-fillable from waitlist)
- On submit: calls `admin-wisehire-invite` edge function
- Show invite URL in success state (copyable)

### `supabase/functions/admin-email-actions/index.ts`
- Add handler for `action_type = 'wisehire_invite'`:
  - Calls `admin-wisehire-invite` internally (or inline the logic)
  - Uses `wisehire-invite.tsx` template
  - Records in audit log

### `src/components/dev-kit/DevKitBadges.tsx`
- Add `AccountType` badge component:
  - `job_seeker` → green/emerald badge: "Job Seeker"
  - `hr` → blue badge: "HR Account"

---

## New Files — Responsibility

| File | Responsibility |
|------|---------------|
| `src/components/landing/LandingToggle.tsx` | The above-nav toggle. Reads `?for=companies` URL param on mount. Updates URL and propagates mode state upward. Smooth 350ms CSS var transition. |
| `src/components/landing/wisehire/WiseHireHero.tsx` | Hero section for WiseHire mode: headline "Hire Smarter. Screen Faster.", typewriter (HR roles), and "Join the Waitlist" CTA that opens `WaitlistModal`. |
| `src/components/landing/wisehire/WiseHireFeatures.tsx` | 5 WiseHire feature pillars: Brief Generator, JD Writer, Pipeline, Bulk Screening, Talent Pool. Follows existing `FeatureSection.tsx` pattern. |
| `src/components/landing/wisehire/WiseHirePricing.tsx` | WiseHire tier cards (Starter $49, Pro $149, Business $399, Enterprise). "Early Access" badge. "Join Waitlist" CTA. No payment button. |
| `src/components/landing/wisehire/WiseHireDemoSection.tsx` | "See it in action" animated demos section. Contains `BriefDemo`, `PipelineDemo`, `JDDemo`. |
| `src/components/landing/wisehire/BriefDemo.tsx` | Animated mockup of Brief Generator output (static animation, no real AI call). |
| `src/components/landing/wisehire/PipelineDemo.tsx` | Animated Kanban board mockup showing candidate stage movement. |
| `src/components/landing/wisehire/JDDemo.tsx` | Animated JD Writer mockup: input → expanding JD output. |
| `src/components/landing/WaitlistModal.tsx` | Modal/drawer with 4-field form. Submits to `wisehire-waitlist-join`. Shows success confirmation. |
| `src/pages/WaitlistPage.tsx` | Standalone waitlist success page (fallback if modal isn't used). |
| `src/pages/wisehire/WiseHireDashboardPage.tsx` | Main dashboard: trial badge, stats, recent briefs, quick actions. Uses `WiseHireShell`. |
| `src/pages/wisehire/WiseHireOnboardingPage.tsx` | 5-step onboarding: Welcome → Company Identity → Hiring Context → AI Setup (Starter only) → Get Started. localStorage draft. Saves to `wisehire_companies` + `profiles.onboarding_completed`. |
| `src/pages/wisehire/WiseHireSubscriptionPage.tsx` | WiseHire plans with "Early Access" badge. Coupon code input (reuses existing `redeem-coupon` function). Trial countdown. No Stripe. |
| `src/pages/wisehire/WiseHireSettingsPage.tsx` | BYOK key management (reuses existing `manage-api-keys` function). Profile editing. Account info. |
| `src/pages/wisehire/BriefGeneratorPage.tsx` | Resume PDF upload + JD text input → "Generate Brief" → `BriefOutput`. Export PDF button. Share button. Recent briefs list. |
| `src/pages/wisehire/BriefViewPage.tsx` | Read/write view for a saved brief by ID. Shows full brief. Export, Share, Add to Pipeline actions. |
| `src/pages/wisehire/JDWriterPage.tsx` | Short input → AI-generated JD → inline editor → save to role → copy to clipboard. JD library tab. |
| `src/pages/wisehire/PipelinePage.tsx` | Kanban board page. Role selector. Drag-and-drop columns. Add Candidate sheet. Candidate detail panel on click. |
| `src/pages/share/PublicBriefPage.tsx` | Public read-only brief view via share token. No auth required. Shows brief details, no edit actions. |
| `src/components/wisehire/WiseHireGuard.tsx` | Checks auth + `account_type = 'hr'`. Redirects job seekers to `/dashboard` with a clear message. Redirects unauthenticated to login. Checks trial/plan status — expired trial without plan → redirects to `/wisehire/contact`. |
| `src/components/wisehire/WiseHireShell.tsx` | Sidebar nav layout for all WiseHire pages. Links: Dashboard, Brief Generator, JD Writer, Pipeline, Settings, Subscription. Trial countdown badge in sidebar header. Uses existing `AppShell` + `SkyWallpaper`. |
| `src/components/wisehire/TrialCountdownBadge.tsx` | Shows "N days left in trial" or "Early Access" badge. Pulled from `subscriptions` table. |
| `src/components/wisehire/ContactUsLockout.tsx` | Full-page lockout: "Your trial has ended. Contact us to continue." Email link to `contact@thewise.cloud`. |
| `src/components/wisehire/brief/BriefForm.tsx` | File upload (`application/pdf`, max 10MB) + JD textarea. Role selector dropdown. "Generate Brief" button with loading state. WCAG-compliant labels. |
| `src/components/wisehire/brief/BriefOutput.tsx` | Renders brief: match score ring, strength chips, concern chips, question list, employment notes. |
| `src/components/wisehire/brief/BriefSkeleton.tsx` | Skeleton version of `BriefOutput` matching layout exactly. |
| `src/components/wisehire/brief/BriefShareModal.tsx` | Copyable share URL. "Revoke Link" button (sets `share_token_active = false`, then regenerates token). |
| `src/components/wisehire/jd-writer/JDWriterForm.tsx` | Textarea (min 10 chars). Role selector. "Write JD" button with streaming-style progressive display. |
| `src/components/wisehire/jd-writer/JDInlineEditor.tsx` | ContentEditable or textarea with sections. Save, Copy buttons. Section headers: Summary, Responsibilities, Requirements, Benefits. |
| `src/components/wisehire/jd-writer/JDLibrary.tsx` | List of saved JDs with role name, creation date, preview snippet. Edit, Copy, Delete actions. |
| `src/components/wisehire/jd-writer/JDSkeleton.tsx` | Skeleton for JD library list items. |
| `src/components/wisehire/pipeline/PipelineBoard.tsx` | 6-column Kanban. `@dnd-kit/core` for drag-and-drop OR custom implementation. Keyboard alternative via `KeyboardPipelineMover`. `role` ARIA attributes for accessibility. |
| `src/components/wisehire/pipeline/PipelineColumn.tsx` | Single stage column. Header with count badge. Droppable zone. |
| `src/components/wisehire/pipeline/CandidateCard.tsx` | Draggable card: name, role, brief match score (if available). Click opens `CandidateDetailPanel`. Keyboard focus/activation. |
| `src/components/wisehire/pipeline/CandidateDetailPanel.tsx` | Slide-over panel: candidate name, brief (if exists), notes field, stage history from `wisehire_pipeline_events`. |
| `src/components/wisehire/pipeline/KeyboardPipelineMover.tsx` | Accessible select-based stage mover (WCAG AA). Shows when candidate card is keyboard-focused. Moves candidate to selected stage and records pipeline event. |
| `src/components/wisehire/pipeline/AddCandidateSheet.tsx` | Sheet for adding a candidate: name, email, PDF upload, role selection. Calls `parse-resume` after upload. |
| `src/components/wisehire/pipeline/PipelineSkeleton.tsx` | Skeleton for 6-column Kanban (placeholder cards in columns). |
| `src/components/wisehire/dashboard/DashboardStats.tsx` | Stat cards: Total Briefs, Open Roles, Candidates in Pipeline, Avg Match Score. Queries `wisehire_candidate_briefs`, `wisehire_roles`, `wisehire_candidates`. |
| `src/components/wisehire/dashboard/DashboardStatsSkeleton.tsx` | Skeleton for 4 stat cards. |
| `src/components/wisehire/dashboard/RecentBriefs.tsx` | Last 3 briefs with candidate name, match score, date. Links to `BriefViewPage`. |
| `src/components/wisehire/dashboard/QuickActions.tsx` | "Generate Brief", "Write JD", "View Pipeline" buttons. |
| `src/components/dev-kit/WiseHireWaitlistPanel.tsx` | New dev kit tab. Table of waitlist entries (name, email, company, size, date, invited badge). "Invite" button per row → calls `admin-wisehire-invite`. Pagination. Search. |
| `src/hooks/wisehire/useWiseHireAccount.ts` | TanStack Query hook: fetches HR user's company, subscription, trial status. Computes `isTrialActive`, `daysRemaining`, `currentPlan`. |
| `src/hooks/wisehire/useBriefs.ts` | CRUD hooks for `wisehire_candidate_briefs`. Queries with `owner_id` filter. Invalidation on generate. |
| `src/hooks/wisehire/useJDs.ts` | CRUD hooks for `wisehire_roles.jd_text`. List, save, delete. |
| `src/hooks/wisehire/usePipeline.ts` | Queries `wisehire_candidates` by role. Mutation for `updatePipelineStage` (writes to candidate + records pipeline event). |
| `src/hooks/wisehire/useWaitlist.ts` | Mutation hook: submits to `wisehire-waitlist-join` edge function. Handles loading/error states. |
| `src/lib/wisehire/pipelineDragDrop.ts` | Drag-and-drop state logic: drag start, drag over, drop. Updates optimistic stage in UI then calls `usePipeline.updatePipelineStage` mutation. |
| `src/lib/wisehire/briefPdfExport.ts` | Generates a clean one-page PDF from brief data using browser print/jsPDF (or calls a simple edge function for server-side render). |
| `src/lib/wisehire/inviteTokenClient.ts` | Client helper: calls `wisehire-validate-invite`, returns `{ valid, recipient_email, error }`. Used by WiseHire sign-up page to gate access. |

---

## Build Order — 11 Steps

Each step is independently deployable and testable before the next begins.

### Step 1: Database Foundation
- Write all 8 SQL migrations (`profiles.account_type` + 7 new tables)
- Apply via `npx supabase db push`
- Create `candidate-resumes` storage bucket via Supabase dashboard or CLI
- Apply storage RLS policies
- Add `WISEHIRE_INVITE_SECRET` to Supabase Edge Function secrets
- **Test**: Query `profiles` table for `account_type` column. Verify all 7 new tables exist with correct columns. Verify storage bucket is created.
- **CHANGELOG**: Log schema addition entry

### Step 2: Landing Page Toggle + WiseHire Theme
- Update `src/pages/Index.tsx` with mode state and `?for=companies` URL handling
- Create `LandingToggle.tsx` (above-nav toggle)
- Create WiseHire hero, feature sections, pricing, demo placeholders (static, no AI)
- Create `WaitlistModal.tsx` (UI only, no backend yet — shows confirmation stub)
- Add `--lp-brand` CSS var switching between crimson and blue
- **Test**: Click toggle → full theme switch in < 400ms. Copy URL → opens in WiseHire mode. CTAs open waitlist modal.
- **CHANGELOG**: Log landing toggle entry

### Step 3: Waitlist Backend
- Create `wisehire-waitlist-join` edge function
- Create `wisehire-waitlist-notification.tsx` and `wisehire-waitlist-confirmation.tsx` email templates
- Wire `WaitlistModal.tsx` to call `wisehire-waitlist-join`
- **Test**: Submit waitlist form → row in DB, confirmation email received by submitter, notification received at `contact@thewise.cloud`.
- **CHANGELOG**: Log waitlist backend entry

### Step 4: Account Type Column + Dev Kit Badges
- `profiles.account_type` migration already applied (Step 1)
- Update `OverviewPanel.tsx` with HR/job seeker count split
- Update `AdminUsersPanel.tsx` with `account_type` badge
- Update `UserDetailDrawer.tsx` with `account_type` field
- Add `AccountType` badge component to `DevKitBadges.tsx`
- **Test**: Existing users in dev kit show "Job Seeker" badge. HR stat = 0, Job Seeker stat = N.
- **CHANGELOG**: Log dev kit account type visibility

### Step 5: Dev Kit WiseHire Admin Tools
- Create `WiseHireWaitlistPanel.tsx` (new dev kit tab)
- Update `CouponsPanel.tsx` with WiseHire tier options
- Update `EmailManagementPanel.tsx` with "Send WiseHire Invite" action
- Create `wisehire-waitlist-join` query endpoint (`admin-wisehire-waitlist` function)
- Create `admin-wisehire-invite` edge function + `wisehire-invite.tsx` email template
- Update `admin-email-actions` to handle `wisehire_invite` action type
- **Test**: Admin sends invite → invite email arrives in inbox. Invite URL valid. Audit log entry created. Waitlist panel shows entries.
- **CHANGELOG**: Log dev kit WiseHire admin tools

### Step 6: WiseHire Sign-Up + Onboarding
- Create `/wisehire/signup?invite={token}` page (validates token via `wisehire-validate-invite`)
- Route invitation code through Kinde sign-up flow (sets company name, company size pre-fill)
- Modify profile creation flow to set `account_type = 'hr'` when invite token present
- Mark invite token as used after successful sign-up
- Create `WiseHireOnboardingPage.tsx` (5 steps, localStorage progress, saves to `wisehire_companies`)
- Create `WiseHireGuard.tsx` (enforces `account_type = 'hr'`, post-trial lockout, unauthenticated redirect)
- Update `App.tsx` with all WiseHire routes wrapped in `WiseHireGuard`
- **Test**: Invited user signs up → `account_type = 'hr'` in DB. Non-invited user sees waitlist. Job seeker navigating to `/wisehire/dashboard` is redirected to `/dashboard`. HR user navigating to `/dashboard` is redirected to `/wisehire/dashboard`.
- **CHANGELOG**: Log account type routing + HR sign-up

### Step 7: Trial Auto-Grant + WiseHire Subscription Page
- Add trial auto-grant logic to profile creation: new HR accounts receive `wisehire_professional` plan, 7 days, via existing `admin-grant-trial` edge function (or inline equivalent)
- Create `WiseHireSubscriptionPage.tsx` (WiseHire tiers, Early Access badge, coupon input)
- Create `TrialCountdownBadge.tsx`
- Create `ContactUsLockout.tsx`
- Create `useWiseHireAccount.ts` hook
- **Test**: New HR user signs up → subscription row shows 7-day Professional trial. Dashboard shows trial badge. Expired trial → lockout screen. Coupon redemption works.
- **CHANGELOG**: Log WiseHire trial + subscription

### Step 8: WiseHire Dashboard Shell
- Create `WiseHireShell.tsx` (sidebar nav layout using AppShell)
- Create `WiseHireDashboardPage.tsx` (stats, recent briefs, quick actions — all empty/zeroed initially)
- Create skeleton components for dashboard stats
- Create `WiseHireSettingsPage.tsx` (BYOK: reuses `manage-api-keys` function)
- **Test**: HR user logs in → lands on WiseHire dashboard with sidebar nav. SkyWallpaper visible. All nav links work. Settings page BYOK save works.
- **CHANGELOG**: Log WiseHire dashboard shell

### Step 9: AI Job Description Writer
- Create `wisehire-write-jd` edge function
- Create `JDWriterPage.tsx`, `JDWriterForm.tsx`, `JDInlineEditor.tsx`, `JDLibrary.tsx`, `JDSkeleton.tsx`
- Create `useJDs.ts` hook
- Wire up to `wisehire_roles` table (save JD to role)
- **Test**: Enter 2-sentence description → full JD returned in < 20s. Save works. Copy works. JD library shows all saved JDs. Starter user with no AI key → "configure your key" message.
- **CHANGELOG**: Log JD Writer feature

### Step 10: AI Candidate Brief Generator
- Create `wisehire-generate-brief` edge function
- Create `BriefGeneratorPage.tsx`, `BriefForm.tsx`, `BriefOutput.tsx`, `BriefSkeleton.tsx`, `BriefShareModal.tsx`, `BriefViewPage.tsx`
- Create `briefPdfExport.ts` (PDF export)
- Create `useBriefs.ts` hook
- Wire up: PDF upload → `candidate-resumes` bucket → `parse-resume` function → brief generation
- Create `PublicBriefPage.tsx` (public share route `/share/brief/:token`)
- **Test**: Upload resume PDF + paste JD → brief generated in < 30s with all sections. Export PDF works. Share link works publicly (no auth required). Revoking share link invalidates old URL. Rate limits work (Starter: 5/day).
- **CHANGELOG**: Log Candidate Brief Generator feature

### Step 11: Candidate Pipeline Board
- Create `PipelinePage.tsx`, `PipelineBoard.tsx`, `PipelineColumn.tsx`, `CandidateCard.tsx`, `CandidateDetailPanel.tsx`, `KeyboardPipelineMover.tsx`, `AddCandidateSheet.tsx`, `PipelineSkeleton.tsx`
- Create `pipelineDragDrop.ts` state logic
- Create `usePipeline.ts` hook
- Wire pipeline events to `wisehire_pipeline_events` table
- **Test**: Add candidate → appears in Shortlisted. Drag to Interviewing → persists after refresh. Pipeline event recorded. Keyboard mover works (tab → select stage → enter to confirm). Filter by role works. Candidate detail panel shows brief if available.
- **CHANGELOG**: Log Pipeline Board feature

---

## Shared Infrastructure Changes Summary

| Infrastructure | Change | Risk |
|---------------|--------|------|
| `profiles` table | Add `account_type` column (non-destructive, default `job_seeker`) | Low |
| `App.tsx` routes | Add `/wisehire/*` group + public share routes | Low |
| `AppShell` / `SkyWallpaper` | No changes — WiseHire pages inherit via `WiseHireShell` | None |
| `aiClient.ts` | No changes — used verbatim by WiseHire edge functions | None |
| `parse-resume` edge function | No changes — called by `AddCandidateSheet` + brief generator | None |
| `admin-email-actions` | Add `wisehire_invite` action type (additive only) | Low |
| `admin-manage-coupons` | Add WiseHire tier keys to allowed plan values (additive) | Low |
| `CouponsPanel.tsx` | Add WiseHire tiers to plan selector | Low |
| `discount_codes` / `coupon_redemptions` | WiseHire tiers added as allowed plan values | Low |
| Existing WiseResume tests | No modifications to existing test files | None |

---

## Environment Variables Required

| Variable | Purpose | Where to Set |
|----------|---------|-------------|
| `WISEHIRE_INVITE_SECRET` | HMAC-SHA256 signing key for invite tokens (min 32 bytes, random) | Supabase Edge Function secrets |
| `RESEND_API_KEY` | Already exists — reused for WiseHire emails | Already configured |
| `EXT_SUPABASE_JWT_SECRET` | Already exists — reused in `requireAuth` | Already configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Already exists — used by admin edge functions | Already configured |

---

## CHANGELOG Entry (to be added at each step)

Each step adds a CHANGELOG entry following the existing style. The format for this feature is:

```
## YYYY-MM-DD

### WISEHIRE-PHASE1-STEP-{N}
- **Summary**: [Step description]
- **Files**: [list of files changed]
- **Spec reference**: specs/001-wisehire-hr-platform/spec.md (FR-XXX, ...)
```

---

## Definition of Done Checklist

- [ ] All 8 SQL migrations applied (`npx supabase db push` clean run)
- [ ] `candidate-resumes` storage bucket created with RLS
- [ ] `WISEHIRE_INVITE_SECRET` set in edge function secrets
- [ ] Landing page toggle passes: theme switch < 400ms, URL updates, WiseHire mode bookmarkable
- [ ] Waitlist form submits → rows in DB, both emails delivered
- [ ] Invite flow: admin sends invite → user receives → signs up → `account_type = 'hr'` confirmed
- [ ] Account type routing: job seeker redirected from `/wisehire/*`, HR redirected from `/dashboard`
- [ ] Dev kit: account type badges visible, WiseHire waitlist panel active, invite send works
- [ ] Trial: 7-day Professional trial auto-granted on HR account creation
- [ ] Post-trial lockout: expired trial without active plan → lockout screen, not broken UI
- [ ] WiseHire subscription page: WiseHire tiers visible, coupon redemption works
- [ ] JD Writer: 2-sentence input → full JD in < 20s
- [ ] Candidate Brief: PDF upload + JD → complete brief in < 30s
- [ ] Brief share link works publicly (no auth). Revoking invalidates link.
- [ ] Pipeline board: drag persists, keyboard mover works (WCAG AA)
- [ ] Pipeline events recorded in `wisehire_pipeline_events`
- [ ] All skeleton loaders present (no blank screens)
- [ ] All WiseHire AI functions fail-closed (rate limiter DB unreachable → 503)
- [ ] Existing Vitest test suite still passes: `npm run test` — 302/302
- [ ] CHANGELOG.md updated for each build step
- [ ] `project-governance/ARCHITECTURE.md` updated with new tables/functions after Step 1
