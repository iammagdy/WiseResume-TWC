---
title: WiseHire Phase 1 — Write technical plan (plan.md) from the approved spec
---
# Task: WiseHire Phase 1 — Technical Plan (plan.md)

  ## Objective
  Write `specs/001-wisehire-hr-platform/plan.md` — the technical plan for WiseHire Phase 1 implementation. This defines HOW to build all Phase 1 features: which files, which tables, which edge functions, the build order.

  **Blocked by**: Governance files task. Must run after governance files are updated.

  ## What to produce
  A complete plan.md at `specs/001-wisehire-hr-platform/plan.md` using the spec-kit plan template at `.agents/skills/spec-kit/templates/plan-template.md`.

  ## Phase 1 scope (from spec)
  1. Landing page toggle + full WiseHire theme switch (CSS vars, content, demos)
  2. Waitlist system (form, emails via Resend, DB tables, botGuard edge function)
  3. Account type split (profiles.account_type column, routing guards)
  4. WiseHire sign-up flow (invite token validation, company fields)
  5. WiseHire onboarding (5-step, localStorage, separate from job seeker onboarding)
  6. Trial + Early Access (7-day auto Professional trial, coupon extension, subscription page)
  7. Dev kit enhancements (waitlist panel, account type badges, overview stats, invite email)
  8. AI Candidate Brief Generator (edge function, brief entity, PDF export, share token)
  9. AI Job Description Writer (edge function, JD library, inline editing)
  10. Candidate Pipeline Board (Kanban UI, drag-and-drop with keyboard alt, stage persistence)

  ## Plan must cover

  ### Constitution check
  Pass all 66 FRs against:
  - Kinde auth (all routes use requireAuth)
  - RLS on all new tables
  - botGuard on all public edge functions  
  - Fail-closed rate limiting on all AI functions
  - Changelog discipline
  - Soft-delete for candidates/Talent Pool entries
  - SkyWallpaper in WiseHire dashboard (existing AppShell)
  - WCAG AA accessibility

  ### New database tables (define all columns + RLS)
  - wisehire_waitlist
  - wisehire_invites
  - wisehire_companies
  - wisehire_roles
  - wisehire_candidates
  - wisehire_candidate_briefs
  - wisehire_pipeline_events
  - profiles.account_type column (migration via db:push)

  ### New Supabase Storage bucket
  - candidate-resumes (path: {hr_user_id}/{candidate_id}/{filename}.pdf, RLS: owning HR user only)

  ### New edge functions (all with requireAuth + botGuard + fail-closed)
  - wisehire-waitlist-join (public + botGuard only)
  - wisehire-validate-invite (public + botGuard only)
  - wisehire-generate-brief (auth + account_type=hr check)
  - wisehire-write-jd (auth + account_type=hr check)
  - admin-wisehire-waitlist (admin-auth)
  - admin-wisehire-invite (admin-auth, generates HMAC-signed token)

  ### New email templates (Resend / React Email)
  - wisehire-invite.tsx (branded WiseHire invite with sign-up link)
  - wisehire-waitlist-confirmation.tsx (confirmation to waitlist submitter)
  - wisehire-waitlist-notification.tsx (admin notification to contact@thewise.cloud)

  ### Modified files (list exact file + what changes)
  - src/pages/Index.tsx — toggle state, WiseHire content sections, meta tag switching
  - src/App.tsx — /wisehire/* routes, account_type guards
  - shared/schema.ts — all new WiseHire tables
  - src/components/dev-kit/OverviewPanel.tsx — HR vs job seeker split
  - src/components/dev-kit/AdminUsersPanel.tsx — account_type badge
  - src/components/dev-kit/UserDetailDrawer.tsx — account_type field
  - src/components/dev-kit/CouponsPanel.tsx — WiseHire tier options
  - src/components/dev-kit/EmailManagementPanel.tsx — WiseHire Invite action type
  - supabase/functions/admin-email-actions/index.ts — WiseHire invite email handler

  ### New files (WiseHire pages + components)
  List every new file with its responsibility.

  ### Build order (MVP-first, independently deployable steps)
  1. Schema additions + db:push (foundation for everything)
  2. Landing page toggle (pure UI, most visible, no backend needed)
  3. Waitlist form + backend (public-facing, captures early interest)
  4. Account type column + dev kit badges (admin visibility)
  5. Dev kit WiseHire admin tools (waitlist panel, invite flow)
  6. WiseHire sign-up + onboarding (invite-only flow)
  7. Trial auto-grant + subscription page (monetization readiness)
  8. WiseHire dashboard shell (navigation, layout, empty states)
  9. JD Writer (validates AI integration, simpler than Brief)
  10. Candidate Brief generator (core AI feature)
  11. Pipeline board (completes Phase 1)

  ## Definition of done
  - plan.md written at specs/001-wisehire-hr-platform/plan.md
  - Constitution check passed for all 66 FRs
  - Every new table fully specified with columns + RLS
  - Every new edge function fully specified with interface
  - Every modified file listed with exact changes
  - Every new file listed with responsibility
  - Build order clearly defined
  - CHANGELOG.md updated