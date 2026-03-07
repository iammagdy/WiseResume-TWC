# CHANGELOG-local.md

This is a local changelog for tracking changes made to WiseResume via Lovable AI sessions.

---

## Unreleased

- Date: 2026-03-07
- Issue ID: ISSUE-C (D-2, D-3, P-2, S-1, PE-1 — Medium UX fixes)
- Summary: Five Medium UX issues fixed in one pass. **(D-2)** Added a server-error state branch (`resumesError && !resumes && navigator.onLine`) between the offline state and empty state on the Dashboard; shows an `AlertCircle` icon, "Something went wrong" message, and a "Tap to retry" `Button` with `RefreshCw` icon that calls `refetch()`. **(D-3)** Persisted `activeTab` and `searchQuery` in `sessionStorage` (keys `wr-dash-tab` / `wr-dash-search`) — both states now initialise from sessionStorage and are synced via `handleSetActiveTab` / `handleSetSearchQuery` helpers; replaced all 3 call sites in the Embla carousel handler, `Tabs onValueChange`, and search `Input onChange`. **(P-2)** Renamed "Export CV" button to "Export Options" and swapped its icon from `Download` to `FileDown` on the Preview page bottom bar; the quick-PDF outline button retains the `Download` icon. **(S-1)** Added a subtle "← Go to WiseResume" link below the Unlock button on the Share page password gate screen (muted text, `text-[11px]`, `hover:text-foreground` transition). **(PE-1)** Wrapped the disabled Save button in `SaveBar` inside a `TooltipProvider/Tooltip/TooltipTrigger` (`<span>` wrapper to capture hover on disabled element) with `TooltipContent` reading "Fix username errors before saving"; the enabled state is unchanged.
- Files touched:
  - `src/pages/DashboardPage.tsx` (D-2: server error state branch + `AlertCircle`/`RefreshCw` imports; D-3: sessionStorage init + helpers + 3 call sites updated)
  - `src/pages/PreviewPage.tsx` (P-2: `FileDown` import + icon/label swap on Export button)
  - `src/pages/SharePage.tsx` (S-1: "← Go to WiseResume" link on password gate)
  - `src/components/portfolio/editor/SaveBar.tsx` (PE-1: Tooltip wrapper on disabled Save button)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No behavior changes. No handlers, routing, save, export, or auth logic modified. `App.tsx`, `types.ts`, `client.ts` untouched. All MEMORY.md "Do Not Touch" constraints respected. SessionStorage keys use `wr-` prefix consistent with existing app convention.

---


- Date: 2026-03-07
- Issue ID: ISSUE-C (D-1, E-1, E-6, P-3, ST-1 — Mobile UX fixes)
- Summary: Five Mobile UX issues fixed in one pass. **(D-1)** Wrapped `AIHealthBadge` in `hidden sm:flex` on the Dashboard header so it hides below the 640px breakpoint, reducing icon clutter on iPhone SE. **(E-1)** Added a right-edge `bg-gradient-to-l from-background to-transparent` overlay (absolute, pointer-events-none, w-8) to the StepperNav mobile pill bar inside a new `relative` wrapper — visually signals horizontal scrollability. **(E-6)** Added `animate-pulse` to the unsaved-changes orange dot and appended a sibling `<span className="text-warning text-[11px]">Unsaved</span>` label for better visibility; only the `hasUnsavedChanges` branch is changed. **(P-3)** Wrapped `NextStepBanner` on the Preview page in `hidden sm:block` so the resume preview is immediately visible on mobile without a banner pushing it down. **(ST-1)** Applied the same right-edge fade gradient pattern as E-1 to the Settings page section-chips bar, inside a new `relative` wrapper div with proper indentation fix.
- Files touched:
  - `src/pages/DashboardPage.tsx` (D-1: `hidden sm:flex` wrapper around `AIHealthBadge`)
  - `src/components/editor/StepperNav.tsx` (E-1: relative wrapper + right-edge fade overlay on mobile pill bar)
  - `src/pages/EditorPage.tsx` (E-6: animate-pulse on unsaved dot + "Unsaved" text label)
  - `src/pages/PreviewPage.tsx` (P-3: `hidden sm:block` wrapper around NextStepBanner)
  - `src/pages/SettingsPage.tsx` (ST-1: relative wrapper + right-edge fade overlay on chips bar)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No behavior changes. No handlers, routing, save logic, or export flows modified. All MEMORY.md "Do Not Touch" files respected. Fade uses semantic `from-background` token (HSL-driven) so it adapts to light/dark mode automatically. `pointer-events-none` on overlay ensures chip/pill taps still register.

---

- Date: 2026-03-07
- Issue ID: ISSUE-C (A-3, A-4, A-5, E-2, E-4, E-5 fixes)
- Summary: Six Medium UX issues fixed in one pass. **(A-3)** Added live portfolio URL helper text below the username field on sign-up: `thewise.cloud/p/{username}`. **(A-4)** Wired the existing `PasswordStrengthMeter` component into the sign-up password field (sign-in form unchanged — still shows "Forgot password?" link). **(A-5)** Changed first/last name grid from `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` so fields stack vertically on iPhone SE (375px). **(E-2)** Replaced `Download` icon with `Eye` icon on the "Preview & Export" button in the editor, matching its actual navigation-to-/preview behaviour. **(E-4)** Renamed the "ATS" mobile tab to "ATS Score" for clarity. **(E-5)** Removed `hidden xs:inline` from the "Offline" status label so it is always visible on 375px viewports.
- Files touched:
  - `src/pages/ClerkAuthPage.tsx` (A-3: username helper text; A-4: PasswordStrengthMeter import + sign-up wire; A-5: grid-cols-1 sm:grid-cols-2)
  - `src/components/editor/EditorSectionContent.tsx` (E-2: Download → Eye icon)
  - `src/pages/EditorPage.tsx` (E-4: "ATS" → "ATS Score" tab label; E-5: remove hidden xs:inline)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No behavior changes. No handlers, logic, or routing modified. `App.tsx`, `types.ts`, `client.ts` untouched. All MEMORY.md "Do Not Touch" constraints respected.

---


- Date: 2026-03-07
- Issue ID: ISSUE-C (A-1 + A-2 fixes)
- Summary: Fixed the two Critical auth issues identified in the ISSUE-C audit. (1) **A-1 — Forgot password flow** — Extended `Mode` type with `'forgot-password'` and `'reset-password'`. Added a `handleForgotPassword` handler that calls `signIn.create({ strategy: 'reset_password_email_code' })` and a `handleResetPassword` handler that calls `signIn.attemptFirstFactor` then sets the session. Added two new animated screens inside `AnimatePresence`. Added a "Forgot password?" text-link below the password field on the sign-in form. `ResetPasswordPage` already redirects to `/auth?mode=forgot`; extended `initialMode` to map that to `'forgot-password'`. (2) **A-2 — Resend code** — Added a `handleResendCode` callback that calls `signUp.prepareEmailAddressVerification({ strategy: 'email_code' })` with `resendLoading` guard. Added a "Resend code" ghost button on the verify-email screen between "Verify & Continue" and "Back". Header copy (`headingText`/`subtitleText` records) extended to cover all five modes.
- Files touched:
  - `src/pages/ClerkAuthPage.tsx` (only file changed — extended Mode type, added 3 handlers, added 2 new screens, added "Forgot password?" link and "Resend code" button)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No other files touched. `ResetPasswordPage.tsx`, `App.tsx`, `types.ts`, `client.ts` all untouched. Clerk integration uses only existing `useSignIn`/`useSignUp` hook methods. No new dependencies. No layout or styling redesign.

---

- Date: 2026-03-07
- Issue ID: ISSUE-C
- Summary: Completed a full UI/UX audit of the entire WiseResume application (landing page, auth, dashboard, editor, preview, share, portfolio editor, public portfolio, applications, AI studio, settings, interview, and profile pages). Found 2 Critical issues, 22 Medium issues, and 18 Low/polish issues. All findings documented with severity ratings, specific file/component references, and recommended fixes. No code changes were made. Full report written to `enhancements-for-vibe-coding/UI-UX-AUDIT.md`.
- Files touched:
  - `enhancements-for-vibe-coding/UI-UX-AUDIT.md` (created — full audit report with per-page findings, severity table, and prioritised fix order)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: Audit only — zero code changes. All MEMORY.md "Do Not Touch" files respected. Critical issues A-1 (missing Forgot Password link) and A-2 (missing Resend Code button) flagged for immediate fix in next session.

---

- Date: 2026-03-07
- Issue ID: ISSUE-B
- Summary: Public link safety audit for thewise.cloud. Two targeted hardening changes were applied after auditing all public resume/portfolio share routes (`/share/:token`, `/p/:username`, `/l/:linkId`). (1) **Open-redirect guard (MEDIUM)** — `resolve-short-link` edge function now strips any `target_url` that does not start with `/` before returning it to the client, preventing a future DB-level injection from ever producing an external redirect payload. `ShortLinkPage.tsx` also independently validates `target_url.startsWith('/')` before calling `navigate()` (defence-in-depth). (2) **Fetch timeout (LOW UX)** — Added a 7-second `AbortController` timeout to the short-link resolution fetch; users now see the "Link Not Found" page instead of an indefinite spinner if the edge function is slow or unreachable. (3) **Finding 2 (LOW, deferred)** — `get_shared_resume` RPC returns the full resume row including `user_id` and internal fields via `row_to_json(v_resume)`. These fields are not rendered in the UI but are visible in DevTools. Patching requires a DB migration to replace `row_to_json(v_resume)` with an explicit `jsonb_build_object` listing only public fields. Deferred to an external tool session per MEMORY.md §7 (backend/security scope). All other findings verified as safe: `get_public_portfolio` exposes no private profile fields; password gate uses server-side BCrypt; comment RLS rate-limiting is correct; `portfolio_enabled` gate prevents disabled portfolios from being served.
- Files touched:
  - `supabase/functions/resolve-short-link/index.ts` (strip non-relative `target_url` before returning)
  - `src/pages/ShortLinkPage.tsx` (client-side `target_url` relative-path guard; 7s `AbortController` timeout; eagerly import constants at module level instead of dynamic import)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No public routes changed to require auth. No layout or styling changes. No Clerk/auth logic touched. No `App.tsx`, `types.ts`, or `client.ts` touched. All MEMORY.md "Do Not Touch" files respected. Finding 2 (`get_shared_resume` over-exposure) documented and deferred.

---

- Date: 2026-03-07
- Issue ID: ISSUE-A
- Summary: Auth route audit for thewise.cloud. (1) Removed dead `wasLoggedInRef` and its unused `useEffect` from `ProtectedRoute` (dead code, never read). (2) Moved `/store-screenshots` and `/screenshots-gallery` inside a bare `<ProtectedRoute>` wrapper in `App.tsx` — these internal tooling pages were previously accessible to anonymous visitors. (3) Fixed `ProtectedRoute`'s loading skeleton container from `bg-background` → `bg-transparent` so `SkyWallpaper` remains visible during the Clerk initialisation phase (MEMORY.md compliance). Known edge case documented but not patched: `AuthCallbackPage` can show a spinner for up to 10 s if the `provision-clerk-user` edge function is cold-starting (ISSUE-A4); patching is deferred to an external tool session per MEMORY.md auth constraints.
- Files touched:
  - `src/components/layout/ProtectedRoute.tsx` (removed `useRef` import + `wasLoggedInRef` + its effect; `bg-background` → `bg-transparent`)
  - `src/App.tsx` (wrapped `/store-screenshots` and `/screenshots-gallery` in a `<ProtectedRoute>` block)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: All existing protected routes verified as already correctly nested under `<ProtectedRoute>`. Public routes (`/`, `/auth`, `/share/:token`, `/p/:username`, `/l/:linkId`, etc.) confirmed untouched. No Clerk key logic, OAuth redirect URLs, or SSO callback handler modified. MEMORY.md "Do Not Touch" files respected.

---

- Date: 2026-03-07
- Issue ID: ISSUE-003
- Summary: Applied targeted first-time UX improvements to the resume editor. (1) Re-added the missing Edit/Preview/ATS tab strip on mobile so users can discover the live preview. (2) Renamed the stepper pill label "Work" → "Experience" for consistency with the section card heading. (3) Replaced vague SectionCard tip strings with action-oriented guidance (Contact, Summary, Experience, Education, Skills). (4) Added a dismissible first-visit onboarding banner that appears only on blank new resumes (gated by `wr-onboarding-hint-seen` in localStorage, consistent with banner-etiquette memory). (5) Added a helper hint under the Description label in expanded Experience entries, visible only while the field is empty.
- Files touched:
  - `src/pages/EditorPage.tsx` (added TabsList import; added 3-tab mobile tab strip; changed step label Work → Experience)
  - `src/components/editor/EditorSectionContent.tsx` (added useState import; added onboarding banner with localStorage gate; updated all 5 section tip strings)
  - `src/components/editor/ExperienceSection.tsx` (added description helper hint, conditionally shown when field is empty)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: No behavior changes. Autosave, preview linking, and all card actions untouched. No Radix Popper introduced. No large layout rewrites. All MEMORY.md "Do Not Touch" files respected. Banner follows the app's existing non-blocking, dismissible pattern.

---

- Date: 2026-03-07
- Issue ID: ISSUE-002
- Summary: Added "Load More" pagination to the dashboard resume list to reduce initial mount/animation cost. Each tab (My CVs, Tailored) now renders at most 10 cards on first load, with a "Load more (N)" button that reveals the next 10. Visible counts reset when search query, active tab, sort, or filters change. Tab count badges continue to reflect the full filtered set. No new dependencies added.
- Files touched:
  - `src/pages/DashboardPage.tsx` (added `PAGE_SIZE`, `visibleMyCVs`, `visibleTailored` state; reset effect; sliced render lists; Load More buttons)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this entry)
- Notes / Constraints: Zero behavior change to existing card actions (edit, duplicate, delete, rename, interview, selection). Stagger animation now runs over ≤10 items eliminating the 50-card simultaneous mount spike on mobile. No Radix Popper introduced. All MEMORY.md "Do Not Touch" files respected.

---

- Date: 2026-03-07
- Issue ID: ISSUE-001 (continued)
- Summary: Extracted two JSX subcomponents from EditorPage, reducing it from ~1,178 → ~923 lines (−255 lines) with zero behavior change.
  - `EditorHeader` — the sticky header block (back button, title, undo/redo, version history, Template/Design/Live/Wise-AI buttons, mobile equivalents).
  - `EditorSectionContent` — the `renderEditorContent` useCallback converted to a proper presentational component (all section cards + prev/next nav buttons).
- Files touched:
  - `src/components/editor/EditorHeader.tsx` (created)
  - `src/components/editor/EditorSectionContent.tsx` (created)
  - `src/pages/EditorPage.tsx` (edited — removed extracted blocks, replaced with component calls, pruned imports)
  - `enhancements-for-vibe-coding/CHANGELOG-local.md` (this file)
- Notes / Constraints: No logic changed. JSX moved verbatim. All MEMORY.md "Do Not Touch" files respected. No Radix Popper components introduced. scrollContainerRef stays in EditorPage.

---

- Date: 2026-03-07
- Issue ID: ISSUE-001
- Summary: Refactored EditorPage (~1,469 → ~1,178 lines, −291 lines) by extracting three focused custom hooks with zero behavior change.
  - `useEditorHydration` — DB→Zustand hydration, ownership check, stale-resume detection.
  - `useEditorAutosave` — debounced cloud save, conflict guard, offline queue, ATS re-score throttle, keyboard-close listener, app-lifecycle background flush.
  - `useEditorSectionScores` — granular section score memos, overall score, local ATS health object, section-completion celebration toasts, confetti state.
- Files touched:
  - `src/hooks/useEditorHydration.ts` (created)
  - `src/hooks/useEditorAutosave.ts` (created)
  - `src/hooks/useEditorSectionScores.ts` (created)
  - `src/pages/EditorPage.tsx` (edited — replaced extracted blocks with hook calls, removed now-redundant imports)
- Notes / Constraints: No JSX changed. No logic changed. All MEMORY.md "Do Not Touch" files respected.

---

<!-- Add new entries below as changes are made. Copy the template for each entry. -->

<!--
Entry template:

- Date: YYYY-MM-DD
- Issue ID: ISSUE-XXX (or N/A)
- Summary:
- Files touched:
- Notes / Constraints:
-->

