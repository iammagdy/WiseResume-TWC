

## Add Critical Pages to WiseResume Architecture

### Overview
Add 4 new pages to complete the app's navigation architecture. The existing 404 page already meets the requirements, so it will be skipped.

---

### 1. `/onboarding` -- Dedicated Onboarding Page

**New file:** `src/pages/OnboardingPage.tsx`

A multi-step flow with 5 screens managed by a `step` state (0-4), distinct from the existing `OnboardingCarousel` (which remains for first-visit dashboard use).

| Step | Screen | Content |
|------|--------|---------|
| 0 | Welcome | AppIcon + "Welcome to WiseResume" greeting, animated entrance |
| 1 | Select Goal | 3 choice cards: "Land a new job", "Update my resume", "Explore templates" -- stored in localStorage as `wr-onboarding-goal` |
| 2 | Pick Template | Grid of 6 popular templates (reuse `TemplateThumbnail` component), selected template stored in localStorage as `wr-onboarding-template` |
| 3 | Notifications | Optional push notification prompt (informational only -- no actual push setup), skip-friendly |
| 4 | Done | Confetti-like sparkle animation, "You're all set!" message, "Get Started" CTA navigating to `/dashboard` |

- Progress indicator: horizontal progress bar at the top using the existing `Progress` component
- Skip button in top-right corner on all steps
- Back/Next navigation buttons at bottom
- Marks `wr-onboarding-completed` in localStorage on finish
- If already completed, redirect to `/dashboard`

**Route registration:** Add to `App.tsx` inside `AppShell` with lazy loading.

---

### 2. `/profile` -- User Profile Page

**New file:** `src/pages/ProfilePage.tsx`

Requires authentication -- redirects to `/auth` if not logged in.

**Layout (top to bottom):**
- Header with back arrow + "My Profile" title
- Avatar (large, 80px) + full name + job title
- Profile completion progress bar (reuse `calculateProfileCompletion`)
- "Edit Profile" button (opens existing `EditProfileSheet`)
- Stats row: glass cards showing resume count and application count
- Resume portfolio section: grid/list of user's resumes (reuse `ResumeListCard`)
- "Share Profile" button (uses `navigator.share` or copies a formatted text summary)

**Data sources:** `useProfile` hook for profile data, `useResumes` hook for resume list, `useJobApplications` for application count.

**Route registration:** Add to `App.tsx` inside `AppShell`.

---

### 3. `/templates` -- Template Browser Page

**New file:** `src/pages/TemplatesPage.tsx`

A full-page template gallery accessible to all users (no auth required).

**Layout:**
- Header with back arrow + "Templates" title
- Filter chips: "All", "Professional", "Creative", "Tech", "ATS-Optimized" (derived from existing template categories)
- Grid of template cards (3 columns on tablet, 2 on mobile) using `TemplateThumbnail`
- Each card shows: template name, ATS badge (High/Medium), category tag
- Tap a card to open a preview sheet (`Sheet`) showing a larger thumbnail + description + "Use Template" button
- "Use Template" navigates to `/editor` after setting the template in the resume store (or creates a new resume with that template)

**Data source:** Reuse the `templates` array from `TemplateSelector.tsx` -- extract it to a shared constant file or import directly.

**Route registration:** Add to `App.tsx` inside `AppShell`.

---

### 4. `/resume/:id` -- Resume Detail Page

**New file:** `src/pages/ResumeDetailPage.tsx`

Shows a single resume's details with action buttons.

**Layout:**
- Header with back arrow + resume title (editable inline)
- Template thumbnail preview (large, centered)
- Metadata section: created date, last edited, template name
- Action buttons grid (2x3): Edit, Preview, Download PDF, Share, Duplicate, Delete
  - Edit navigates to `/editor` with resume loaded
  - Preview navigates to `/preview`
  - Download triggers PDF generation (reuse `pdfGenerator`)
  - Share opens `ShareSheet`
  - Duplicate calls `createResume` mutation with cloned data
  - Delete shows confirmation dialog then calls `deleteResume` mutation
- Health score ring (if score data exists, reuse `ScoreRing`)

**Data source:** `useResumes` to fetch by ID from URL param, `useResumeScore` for health data.

**Route registration:** Add to `App.tsx` inside `AppShell` as `<Route path="/resume/:id" ...>`.

---

### 5. 404 Page -- Already Complete

The existing `NotFound.tsx` already has centered layout, illustration (AlertCircle icon), "Page Not Found" heading, message text, and "Return to Home" CTA. No changes needed.

---

### Route & Navigation Updates

**`src/App.tsx`:**
- Add 4 new lazy-loaded page imports
- Add routes inside `AppShell`: `/onboarding`, `/profile`, `/templates`, `/resume/:id`

**`src/components/layout/AppShell.tsx`:**
- Add new routes to `TAB_ROUTES` array so bottom nav remains visible

**`src/lib/navigation.ts`:**
- Add back routes: `/onboarding` -> `/dashboard`, `/profile` -> `/dashboard`, `/templates` -> `/dashboard`, `/resume/:id` -> `/dashboard` (pattern match)

---

### Shared Template Data Extraction

**New file:** `src/lib/templateData.ts`

Extract the `templates: TemplateInfo[]` array currently defined inside `TemplateSelector.tsx` into a shared module so both `TemplateSelector`, `TemplatesPage`, and `EmptyState` can import it without duplication.

---

### Technical Summary

| Item | Detail |
|------|--------|
| New files | `OnboardingPage.tsx`, `ProfilePage.tsx`, `TemplatesPage.tsx`, `ResumeDetailPage.tsx`, `templateData.ts` |
| Modified files | `App.tsx` (routes), `AppShell.tsx` (TAB_ROUTES), `navigation.ts` (back routes), `TemplateSelector.tsx` (import from shared data) |
| Reused components | `TemplateThumbnail`, `ResumeListCard`, `ScoreRing`, `EditProfileSheet`, `ShareSheet`, `Progress`, `AppIcon` |
| Reused hooks | `useProfile`, `useResumes`, `useResumeScore`, `useJobApplications`, `useAuth` |
| Auth requirements | `/profile` requires auth; others are public |
| Storage | Onboarding progress in localStorage (`wr-onboarding-goal`, `wr-onboarding-template`, `wr-onboarding-completed`) |

