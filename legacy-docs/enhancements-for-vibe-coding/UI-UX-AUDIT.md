# UI/UX Audit — WiseResume (thewise.cloud)

**Issue ID:** ISSUE-C  
**Audit Date:** 2026-03-07  
**Auditor:** Lovable AI (vibe-coding workflow)  
**Status:** ✅ Audit complete — awaiting fix confirmation  
**Context docs:** MEMORY.md, SPEC.md, CHANGELOG-local.md

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 **Critical** | Blocks a core user flow entirely (no workaround) |
| 🟠 **Medium** | Confusing or broken on a subset of devices/flows; workaround exists |
| 🟡 **Low** | Cosmetic, copy inconsistency, or minor accessibility gap |

---

## 1. Landing Page (`src/pages/Index.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| L-1 | 🟠 Medium | `Log in` nav button routes to `/auth?mode=login` but `ClerkAuthPage` only checks `mode=signup` — `mode=login` is silently ignored; page renders the sign-in form anyway but the query param is misleading and could confuse future devs. | The form still shows sign-in, so UX isn't broken today, but the intent vs behaviour is mismatched. |
| L-2 | 🟡 Low | "Already have an account? Log in →" appears **twice** — once in the hero subtext and once in the top-right header button. | Redundant; the header link is sufficient. |
| L-3 | 🟡 Low | CTA hierarchy: "Get Started Free" and "Tailor Resume to a Job" are both rendered at primary-button weight. The secondary CTA has a lock icon + "Sign up to unlock" label, which contradicts the "free" framing one line above. | Either remove the lock icon or rephrase to "Create free account to unlock". |
| L-4 | 🟡 Low | Trust bar checkmarks (✓) have no `aria-label`. Screen readers announce "tick tick tick" rather than the benefit labels. | Add `role="img" aria-label="…"` to each checkmark span. |
| L-5 | 🟡 Low | "WiseResume" brand name in the sticky header starts at `opacity-0` and fades in on scroll. The brand is invisible to screen readers until user scrolls. | Use `aria-hidden={!scrolled}` or always render with `sr-only` fallback. |
| L-6 | 🟡 Low | `SkyWallpaper` GPU animation has no guard for `prefers-reduced-motion` at the background level. The CSS keyframes `sky-breathe` / `cloud-drift` still run on reduced-motion devices. | Already partially scoped in `SkyWallpaper.tsx` via `prefersReducedMotion` — verify it covers all animation layers. |
| L-7 | 🟡 Low | Authenticated hero quick-action "My Resumes" navigates to `/dashboard` which then renders (adding a round-trip). Could go directly to `/dashboard` — which it already does — but the label "My Resumes" doesn't clearly indicate it lands on the dashboard, not a dedicated resumes list. | Rename to "Dashboard" or keep as-is but accept the slight confusion. |

---

## 2. Auth Page (`src/pages/ClerkAuthPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| A-1 | 🔴 **Critical** | **"Forgot password?" link is completely absent** from the sign-in form. The `/reset-password` route exists and redirects to `/auth?mode=forgot`, but there is no visible link from the auth page to reach it. A user who forgets their password has no discoverable recovery path. | Fix: add a small "Forgot password?" text-link below the password field that navigates to `/auth?mode=forgot`. |
| A-2 | 🟠 Medium | **No "Resend code" button** on the `verify-email` screen. If the verification email is delayed or the code expires, the user is stuck — their only option is to click "Back" and re-submit the entire signup form, which may re-trigger account creation errors. | Fix: add a "Resend code" button that calls `signUp.prepareEmailAddressVerification({ strategy: 'email_code' })`. |
| A-3 | 🟠 Medium | **Username field has no helper text.** New users see a required "Username" field with no explanation. They don't know it will become their public portfolio URL (`thewise.cloud/p/<username>`). Many users will type their full name with spaces, causing a validation error with no guidance. | Fix: add helper text "This becomes your public portfolio URL: thewise.cloud/p/username". |
| A-4 | 🟠 Medium | **No password requirements shown up front.** Password rules only surface when Clerk rejects the submission. Users get a cold error after typing. `PasswordStrengthMeter` component already exists in `src/components/auth/PasswordStrengthMeter.tsx` but is not used in `ClerkAuthPage`. | Fix: wire `PasswordStrengthMeter` into the sign-up password field. |
| A-5 | 🟠 Medium | **First/Last name fields are a 2-column grid** (`grid-cols-2`). On iPhone SE (375px) these are approximately 160px each including a leading icon — the icon crowds the input, and autocomplete suggestions are clipped. | Fix: stack to single column below `sm:` breakpoint (`grid-cols-1 sm:grid-cols-2`). |
| A-6 | 🟡 Low | Loading spinner label is "Setting up your account..." for **all** loading conditions including initial Clerk SDK initialisation. A user landing on the page cold sees this message even though no account setup is happening. | Fix: show "Loading…" for SDK init and reserve "Setting up your account…" for the post-submit provisioning step. |

---

## 3. Dashboard (`src/pages/DashboardPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| D-1 | 🟠 Medium | **Mobile header is overcrowded.** On 375px the header row contains: HelpCircle, `AICreditsIndicator`, `AIHealthBadge`, Trash icon, Settings icon, and Profile avatar — 6 tappable items. The two AI items in particular (`AICreditsIndicator` + `AIHealthBadge`) are power-user tools that first-time users won't understand and that occupy prime header real estate. | Fix: hide `AIHealthBadge` on `< sm` or move to a single "AI" popover. |
| D-2 | 🟠 Medium | **Server error is not surfaced to the user.** The condition `resumesError && !resumes && !navigator.onLine` only shows the offline state. If `resumesError` is truthy but `navigator.onLine` is `true` (server error), the component falls through to the empty state, showing "No resumes yet" instead of an error message. | Fix: add an `else if (resumesError)` branch with a "Something went wrong — tap to retry" error state. |
| D-3 | 🟠 Medium | **Tab state and search query reset on navigation.** If a user clicks into the "Tailored" tab, searches for a resume, edits it, then navigates back — they land on the default "My CVs" tab with an empty search box. The context is lost. | Fix: persist `activeTab` and `searchQuery` in `sessionStorage` or React Router state and restore on mount. |
| D-4 | 🟡 Low | **"Tailored" tab empty state copy inconsistency.** Empty state says: "Open any CV and use **'Tailor for Job'** to create one." The button on resume cards is labelled **"Tailor"**, not "Tailor for Job". | Fix: align copy to match the actual button label. |
| D-5 | 🟡 Low | **"Load more" button is easy to miss.** It uses `ghost` styling and sits below the last card with no visual separator. On long lists users may not notice there are more items. | Fix: change to `outline` or `secondary` variant with a subtle top border above it. |
| D-6 | 🟡 Low | **`DashboardStats` motivational subtitle** cycles through 4 random strings each render — could show the same string twice in a row with no apparent reason for the change. | Fix: use a stable deterministic selection (e.g., `dayOfYear % 4`). |
| D-7 | 🟡 Low | **`WhatsNextCard` renders for all users** including power users who have completed all suggested steps. When all steps are exhausted the card shows a tip, which is fine — but there's no final "You're all set!" empty state when all tips are also dismissed. | Low priority — existing behaviour is acceptable; worth polishing later. |

---

## 4. Resume Editor (`EditorPage.tsx`, `EditorHeader.tsx`, `EditorSectionContent.tsx`, `StepperNav.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| E-1 | 🟠 Medium | **StepperNav horizontal scroll has no edge fade indicator.** The mobile pill bar is `overflow-x-auto` but there is no right-side shadow or fade overlay to indicate that more pills are scrollable. Users on iPhone SE (5 sections visible, ~3 more hidden) may never discover the remaining sections. | Fix: add a `::after` pseudo-element fade or a `<div>` overlay gradient on the right edge. |
| E-2 | 🟠 Medium | **"Preview & Export" button has a `Download` icon** (`<Download />` from lucide-react) but navigates to `/preview` — it does not trigger a download. The icon misrepresents the action. First-time users may expect a file to be saved. | Fix: change icon to `<Eye />` or `<ArrowRight />`. |
| E-3 | 🟠 Medium | **EditorHeader title click navigates to `/dashboard`** (via `onTitleClick` → `navigate('/dashboard')`). Users expect clicking a document title to either do nothing or open an inline rename dialog — not silently navigate away from the editor, potentially losing unsaved context. There is no visual affordance (underline, hover cursor: pointer with tooltip) to indicate it's a navigation link. | Fix: add a `title` tooltip "Back to Dashboard" or change the UX to an inline rename on click, navigating only via the explicit Back (←) button. |
| E-4 | 🟠 Medium | **"ATS" tab label in the mobile Edit/Preview/ATS strip is unexplained.** "ATS" is an industry acronym most non-technical job seekers won't recognise on first use. No tooltip or full-form label is shown. | Fix: show "ATS Score" with a small info icon, or use a `Tooltip` component with "Applicant Tracking System score". |
| E-5 | 🟠 Medium | **"Offline" save-status label is `hidden xs:inline`**, which means it is invisible on all viewports below the `xs` breakpoint (< 480px — includes iPhone SE at 375px). Users on small phones see the orange dot with no text explanation. | Fix: remove the `hidden xs:inline` guard or change to `inline` so the label always shows. |
| E-6 | 🟠 Medium | **Unsaved changes indicator is too subtle.** A small orange dot (`w-2 h-2`) next to the title is the only visual signal that there are unsaved changes. Users who ignore the dot will not know they need to wait before navigating away. | Fix: consider an orange border around the title, a small "Unsaved" text badge, or a more visible pulsing dot. |
| E-7 | 🟡 Low | **StepperNav desktop "More" pill shows only a `+` icon** with no text label when no sub-section is active. The mobile version shows "+ More sections" text. Inconsistent. | Fix: add "More" label on desktop too, matching mobile. |
| E-8 | 🟡 Low | **`bg-background` on the editor `<main>` element** covers the `SkyWallpaper`. Per MEMORY.md the wallpaper should be visible. This may be intentional for the editor (clean writing surface), but it is noted as a discrepancy from the global design rule. | Document as intentional exception or align with MEMORY.md. |

---

## 5. Preview Page (`src/pages/PreviewPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| P-1 | 🟠 Medium | **"ATS-Ready" label is hardcoded on all templates** regardless of the template's actual ATS compatibility. Templates like "Creative" which use columns/graphics are shown as ATS-Ready. This misinforms users making template choices. | Fix: make the badge conditional on a per-template `atsOptimized: boolean` flag in the template registry. |
| P-2 | 🟠 Medium | **Two download buttons with identical `<Download />` icons** ("Export CV" + quick PDF icon button). New users cannot tell the difference. | Fix: rename "Export CV" to "Export Options" and use a `<Settings2 />` or `<FileDown />` icon; keep the quick PDF button as `<Download />`. |
| P-3 | 🟠 Medium | **`NextStepBanner` (AI Tailor hint) stacks between template selector and resume preview** on mobile. This pushes the actual resume preview significantly lower, requiring a scroll to see any content. On iPhone SE the resume might not be visible at all without scrolling. | Fix: collapse the banner on mobile (`hidden sm:block`) or make it dismissible with localStorage persistence. |
| P-4 | 🟠 Medium | **"Edit" action bar button navigates to `/editor` without re-hydrating the store** from the URL. It relies on the store already having the correct `currentResumeId`. If the store is cleared (e.g. hard refresh on preview URL), the editor opens with no resume loaded. | Fix: navigate to `/editor?id=${currentResumeId}` (if that pattern is supported) or ensure the store is always re-hydrated before navigating. |
| P-5 | 🟡 Low | **Hardcoded padding values** (`pl-[10px] pr-[10px]`, `pl-[5px]`) in the bottom action bar. These should use Tailwind spacing tokens (`px-2.5`, `pl-1.5`) for consistency. | Minor code smell; no user-facing impact. |

---

## 6. Share Page (`src/pages/SharePage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| S-1 | 🟠 Medium | **Password-protected share page has no "Back to Home" CTA.** If a user receives a password-protected link and doesn't know the password, they are stranded on the page with no navigation back to the app or home page. | Fix: add a small "← Go to WiseResume" link at the bottom of the password gate UI. |
| S-2 | 🟡 Low | **"Resume Not Found" error page uses `bg-background`** with no app logo or branding. The page looks visually orphaned compared to the rest of the app. | Fix: add the WiseResume logo/wordmark and a branded "Return Home" button. |
| S-3 | 🟡 Low | **Password gate has no visible "press Enter to submit" affordance.** The input has `onKeyDown` Enter handling in the code, but there's no visible hint (e.g. `↵` icon or "Press Enter to continue" helper text). | Fix: add a `<kbd>Enter</kbd>` hint next to the Unlock button, or ensure the input is wrapped in a `<form>` with a submit handler. |

---

## 7. Portfolio Editor (`src/pages/PortfolioEditorPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| PE-1 | 🟠 Medium | **"Save" button is disabled with no explanation** when the username is taken or invalid. The `SaveBar` renders the button as `disabled` but there is no tooltip, helper text, or inline message explaining why. Users may think the button is broken. | Fix: show a tooltip `"Fix username errors before saving"` on the disabled button, or show an inline message above the Save button. |
| PE-2 | 🟡 Low | **No sub-heading on the Portfolio Editor page.** The page title is just "Portfolio". A first-time user doesn't know this page configures their public website at `thewise.cloud/p/username`. | Fix: add a subtitle "Set up your public portfolio website" below the page title. |
| PE-3 | 🟡 Low | **No live URL preview until a valid username is entered.** Users don't know what their portfolio URL will look like before they confirm a username. | Fix: show a greyed-out URL preview `thewise.cloud/p/____` that updates as the user types (even before validation passes). |
| PE-4 | 🟡 Low | **Username validation error appears below the field** with no visual connection (e.g. red border on the input). Only the text below is red; the field itself doesn't change. | Fix: add `border-destructive` to the input when there's an error, consistent with other form fields. |

---

## 8. Public Portfolio Page (`/p/:username`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| PP-1 | 🟠 Medium | **No branded 404 page for portfolios not found.** When a user navigates to `/p/nonexistent`, the page renders a plain "Not found" state with minimal styling and no WiseResume branding or CTA. | Fix: create a styled "Portfolio Not Found" page matching the app's design language with a CTA linking to the landing page. |
| PP-2 | 🟡 Low | **`SkyWallpaper` GPU animation runs on this standalone public page.** Per SPEC.md Known Issues and MEMORY.md, public standalone pages should not run the heavy background animation (visible in `SkyWallpaper.tsx` `PUBLIC_ROUTES` exclusion list — verify it includes `/p/` paths). | Fix: confirm `/p/` is in `SkyWallpaper`'s exclusion list. |

---

## 9. Applications / Job Tracker (`src/pages/ApplicationsPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| AP-1 | 🟡 Low | **Status badge text is lowercase** (`applied`, `screening`, `interviewing`). Standard UI convention is Title Case for status labels. | Fix: capitalise via CSS `capitalize` or update the underlying string values. |
| AP-2 | 🟡 Low | **"Prep" button label on interviewing applications is terse.** "Prep" has no context — "Practice Interview" is clearer. | Fix: rename button to "Practice" or "Interview Prep". |
| AP-3 | 🟡 Low | **`FlaskConical` icon in the page header has no accessible label or tooltip.** Screen readers announce nothing useful. | Fix: add `aria-label="AI Tools"` or a visible tooltip. |

---

## 10. AI Studio (`src/pages/AIStudioPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| AI-1 | 🟠 Medium | **No visual grouping or hierarchy for tool cards.** The page lists all AI tools as a flat grid. A new user does not know which tool to try first. There's no "Start here" section or recommended tool highlight. | Fix: add section headings (e.g. "Improve your resume", "Job matching", "Interview prep") to group related tools. |
| AI-2 | 🟠 Medium | **`AIHealthBadge` + `AICreditsIndicator` appear in both the Dashboard header and AI Studio page**, but in different positions and visual treatments. This inconsistency makes the credit status feel like two different things. | Fix: standardise the placement — show both only in AI Studio (or a shared popover) and remove from the main Dashboard header. |

---

## 11. Settings Page (`src/pages/SettingsPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| ST-1 | 🟠 Medium | **Section index chips scroll horizontally with no edge fade indicator.** The chip bar (Account, Appearance, AI & Voice, Editor, Notifications, Privacy, About) is `overflow-x-auto` with no right-edge gradient. On 375px some chips may be hidden with no visible affordance. | Fix: add a right-edge `::after` gradient overlay (same pattern as E-1). |
| ST-2 | 🟡 Low | **Sign Out is only reachable via a nested menu** (profile avatar → Sign Out). There is no explicit Sign Out row in the Settings page itself. Some users expect "Sign Out" at the bottom of Settings. | Fix: add a "Sign Out" row at the bottom of the Privacy or Account section for discoverability. |

---

## 12. Interview Page (`src/pages/InterviewPage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| IN-1 | 🟠 Medium | **No pre-session information panel.** Users start an interview with no indication of how many questions will be asked, the estimated duration, or the interview type. They are dropped straight into the session. | Fix: add a "Ready to start?" confirmation modal or intro card showing session details before the first question. |
| IN-2 | 🟡 Low | **No-resume empty state CTA** — when `!hasValidResume`, the page shows a guard message. Verify this message includes a direct CTA button to `/dashboard` or `/editor` to add a resume, rather than a dead-end text message. | Check and add CTA if missing. |

---

## 13. Profile Page (`src/pages/ProfilePage.tsx`)

| # | Severity | Finding | Notes |
|---|----------|---------|-------|
| PR-1 | 🟡 Low | **"Copy" button label is ambiguous.** The button copies the "profile summary" but its label is just "Copy" (icon only or minimal text). Users don't know what is being copied. | Fix: change to "Copy Summary" or add a `title="Copy profile summary"` attribute. |
| PR-2 | 🟡 Low | **Completion progress bar + tip text can overflow on 375px** when the next missing field tip string is long. The percentage number and tip text are on the same line. | Fix: stack the percentage and tip on separate lines for `xs` screens. |

---

## Summary by Severity

### 🔴 Critical (2 issues — fix immediately)
| ID | Page | Issue |
|----|------|-------|
| A-1 | Auth | No "Forgot password?" link on sign-in form |
| A-2 | Auth | No "Resend code" button on verify-email screen |

### 🟠 Medium (22 issues — fix in next sprint)
A-3, A-4, A-5, D-1, D-2, D-3, E-1, E-2, E-3, E-4, E-5, E-6, P-1, P-2, P-3, P-4, S-1, PE-1, PP-1, AI-1, AI-2, ST-1, IN-1

### 🟡 Low (18 issues — polish pass)
L-1 through L-7, A-6, D-4 through D-7, E-7, E-8, P-5, S-2, S-3, PE-2 through PE-4, PP-2, AP-1 through AP-3, ST-2, IN-2, PR-1, PR-2

---

## Recommended Fix Order

Priority is determined by: (1) how many users are blocked, (2) how easy the fix is.

| Priority | ID | Fix | Effort |
|----------|-----|-----|--------|
| **P1** | A-1 | Add "Forgot password?" link on sign-in form → `/auth?mode=forgot` | XS |
| **P2** | A-2 | Add "Resend code" button on verify-email screen | XS |
| **P3** | E-2 | Change Download icon → `<Eye />` on "Preview & Export" button | XS |
| **P4** | A-3 | Add username helper text ("Your public portfolio URL will be…") | XS |
| **P5** | A-4 | Wire `PasswordStrengthMeter` into sign-up password field | S |
| **P6** | A-5 | Stack first/last name fields on mobile (`grid-cols-1 sm:grid-cols-2`) | XS |
| **P7** | P-1 | Make "ATS-Ready" badge conditional on template `atsOptimized` flag | S |
| **P8** | D-1 | Hide `AIHealthBadge` on mobile dashboard header | XS |
| **P9** | E-1 | Add right-edge fade to StepperNav pill bar (scroll hint) | S |
| **P10** | E-5 | Remove `hidden xs:inline` from "Offline" save-status label | XS |
| **P11** | P-2 | Rename/re-icon Export CV vs quick PDF download buttons | XS |
| **P12** | E-3 | Add tooltip "Back to Dashboard" to editor title or change to rename UX | S |
| **P13** | E-4 | Add tooltip/full label to "ATS" tab in mobile editor strip | XS |
| **P14** | S-1 | Add "← Go to WiseResume" CTA on password-gate share page | XS |
| **P15** | PE-1 | Show tooltip on disabled Save button in Portfolio Editor | XS |
| **P16** | D-2 | Add server-error state branch to dashboard resume list | S |
| **P17** | D-3 | Persist tab + search state in `sessionStorage` | M |
| **P18** | AI-1 | Add section headings to AI Studio tool grid | S |
| **P19** | ST-1 | Add right-edge fade to Settings section index chip bar | XS |
| **P20** | IN-1 | Add pre-session info panel to Interview page | M |

**Effort key:** XS = < 30 min, S = 30–90 min, M = 90 min–half day

---

*This audit was generated as part of the vibe-coding enhancement workflow. No code changes were made. See CHANGELOG-local.md for the corresponding entry.*
