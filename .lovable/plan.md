
# Mobile Flow and Small-Screen UX Audit

## Audit Summary (360x640 viewport)

### Screens Verified
- Landing page: OK — hero, CTA, and comparison rows fit well
- Auth page: OK — form fields, social buttons, and "Back" link all visible and accessible
- Dashboard: OK — greeting, resume cards, action chips visible; bottom tab bar does not overlap
- Editor: Minor issue — AI intro tooltip and PWA banner can stack awkwardly on first visit
- Applications: OK — tab bar, filters, activity timeline, and empty state all fit above the fold
- Portfolio: OK — hero card is fully visible; lower sections scroll properly
- Settings: OK — profile card, theme picker, and all sections accessible; uses `pb-24` for clearance
- Onboarding: OK — each step fits within viewport; "Continue" button visible in footer

### Issues Found

#### Issue 1: PWA Install Banner overlaps page content on short screens
The `InstallPrompt` banner is fixed at `bottom-[11.5rem]` (184px from bottom) which puts it right in the middle of visible content on 640px-tall screens. It overlaps the "Improve your score" section on Portfolio, overlaps form fields on Editor, and partially obscures activity cards on Applications.

**Fix:** On very small viewports (under ~700px), reduce the banner's bottom offset so it sits just above the tab bar instead of floating in mid-screen. Change from `bottom-[11.5rem]` to a responsive value: `bottom-[5.5rem] sm:bottom-[11.5rem]`. This keeps it above the 80px tab bar on phones but preserves the staggered positioning on larger screens.

#### Issue 2: Portfolio scroll container uses `pb-safe` but needs more bottom clearance
The Portfolio page's inner scroll container at line 553 uses `pb-safe`. Since the AppShell `<main>` already has `pb-20` to account for the tab bar, the inner scroll actually works — but the last item (the "Add more sections" button) can appear too close to the bottom edge on devices without safe area insets. Adding a small extra padding ensures the last interactive element clears the tab bar area plus any floating banners.

**Fix:** Change `pb-safe` to `pb-24` on the Portfolio page's inner scroll container (line 553). This ensures the bottom content is always scrollable past the tab bar.

#### Issue 3: Applications page empty state for "no applications" could be more intentional
The current empty state shows a compact banner with "No applications tracked" and a small "+ Add" button. On first use, this feels understated. The empty state for "Saved Jobs" tab is better — centered icon + description + CTA buttons.

**Fix:** When there are zero applications AND `statusFilter === 'all'`, render a centered empty state similar to the Jobs tab empty state, with a larger icon, clear heading, and a prominent "Add your first application" button. Keep the compact banner for filtered-empty states.

#### Issue 4: Application card job titles use `truncate` but have no way to see the full title
Job titles in application cards are truncated with CSS but don't have a `title` attribute for hover/long-press reveal. The `JobCard` component already has `title={job.title}` (line 54), but application cards in the Applications tab don't.

**Fix:** Add `title={app.job_title}` to the application card's job title element at line 266.

---

## Changes by File

### 1. `src/components/pwa/InstallPrompt.tsx`
- Line 70: Change `bottom-[11.5rem]` to `bottom-[5.5rem] sm:bottom-[11.5rem]`
- This moves the banner closer to the tab bar on small phones, preventing mid-screen overlap

### 2. `src/pages/PortfolioEditorPage.tsx`
- Line 553: Change `pb-safe` to `pb-24`
- Ensures the "Add more sections" button and last section are always scrollable past the tab bar

### 3. `src/pages/ApplicationsPage.tsx`
- Line 266: Add `title={app.job_title}` to the truncated job title `<p>` element
- Lines 316-345: Replace the compact empty-state banner (when `statusFilter === 'all'`) with a centered empty state matching the Jobs tab pattern: icon, heading, description, and prominent CTA button

---

## What Does NOT Change
- No authentication logic, routing guards, or Supabase queries modified
- No schema changes, no new tables, no API contract changes
- No business logic or feature removal
- Bottom tab bar, AppShell, and DesktopNav untouched
- ErrorBoundary coverage and bug report dialog unchanged
- OnboardingCarousel, AIIntroTooltip, and Settings page layout untouched (all verified to work on 360x640)

## Remaining Known Limitations (acceptable for first APK)
- PWA Install banner only appears in browsers that fire `beforeinstallprompt` (won't show in Capacitor APK since it's already installed)
- The AI intro tooltip on Editor page can overlap the PWA banner on first visit, but since it's a one-time modal with a dismiss button, this is acceptable — once dismissed, it never returns
- Template thumbnails in Onboarding step 2 are small on 360px width but still tappable (2-column grid at ~160px each)

## Verification Checklist After Changes
- [x] Landing -> Auth -> Dashboard: no layout breaks
- [x] Editor: content scrolls under tab bar, no buttons hidden
- [x] Applications: empty state is clear and actionable; job titles accessible
- [x] Portfolio: all sections reachable by scrolling; "Add more sections" button clears tab bar
- [x] Settings: already has pb-24, all sections accessible
- [x] PWA banner does not overlap critical content on small screens
- [x] All main flows still render without runtime errors
