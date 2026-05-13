# Dashboard UI/UX Audit Report

**Date:** 2026-05-13
**Scope:** `/dashboard` route and all child surfaces
**Method:** Static code review of `src/pages/DashboardPage.tsx` and `src/components/dashboard/*.tsx`

---

## Summary

| Severity | Count |
|----------|------:|
| Critical | 2 |
| High | 4 |
| Medium | 6 |
| Low | 4 |
| **Total** | **16** |

---

## Critical Issues

### C1 — Delete flow bypasses confirmation on swipe (Data Loss Risk)
- **Component:** `ResumeListCard.tsx`
- **Issue:** When user swipes left on a card to delete, the `confirmSwipeActions` prop defaults to `true`, which triggers `onDelete(resume.$id)` immediately after the spring animation — but the parent `DashboardPage` then opens an `AlertDialog` for confirmation. However, the toast "deleted" fires **after** the async delete succeeds, not after user confirmation. More critically, if `confirmSwipeActions=false` (line 189), the card animates off-screen and deletes without any confirmation dialog.
- **Impact:** Accidental swipe deletes data permanently with only a brief animation as warning.
- **Fix:** Always require explicit confirmation before delete. Disable swipe-to-delete or make it trigger the confirmation dialog, not the actual delete mutation.
- **Effort:** Low

### C2 — `toast` imported from raw `sonner` instead of wrapped version (Toast styling breaks)
- **Component:** `DashboardPage.tsx:54`
- **Issue:** `import { toast } from 'sonner'` uses the raw Sonner toast, bypassing our custom styled wrapper in `@/components/ui/sonner`. All toasts triggered from the dashboard (rename success/error, delete success) will appear with Sonner's default styling, not the redesigned premium cards.
- **Impact:** Inconsistent toast appearance across the app.
- **Fix:** Change import to `import { toast } from '@/components/ui/sonner'`.
- **Effort:** 1-line fix

---

## High Issues

### H1 — Filter/Sort UI removed but filter logic still active (Confusing UX)
- **Component:** `DashboardPage.tsx:909`
- **Issue:** The `ResumeFilters` component is imported but never rendered (comment says "Filter/Sort bar removed — simplified UI"). However, the filter state (`categoryFilters`, `scoreFilters`, `sortOption`) and all filtering logic in `filteredResumes` still runs. If a user somehow had filter state in a previous session, the resume list would silently be filtered with no UI to show or clear it.
- **Impact:** Users may see an empty or unexpectedly filtered resume list with no way to fix it.
- **Fix:** Either re-enable the filter UI or remove all filter state/logic from DashboardPage.
- **Effort:** Medium

### H2 — `ResumeFilters` component is dead code (Bundle bloat)
- **Component:** `ResumeFilters.tsx`
- **Issue:** The entire `ResumeFilters.tsx` file (163 lines) is imported in DashboardPage but never rendered. It imports `framer-motion`, `lucide-react`, `Popover`, etc. — all dead weight in the dashboard chunk.
- **Impact:** Unnecessary bundle size (~5-10KB after tree-shaking).
- **Fix:** Remove import and file, or re-integrate it.
- **Effort:** Low

### H3 — `FloatingCreateButton` is dead code (Bundle bloat)
- **Component:** `FloatingCreateButton.tsx`
- **Issue:** The FAB component (154 lines) is never used in DashboardPage. It imports `createPortal`, `framer-motion`, `lucide-react`, etc.
- **Impact:** Unnecessary bundle size. The FAB is also conceptually duplicative — the dashboard already has a "Build a Resume" CTA in `DashboardHero` and "Create Your First Resume" in `EmptyState`.
- **Fix:** Remove the component or integrate it if mobile UX needs a persistent create action.
- **Effort:** Low

### H4 — Bulk delete has no undo (Data Loss Risk)
- **Component:** `DashboardPage.tsx:526-536`
- **Issue:** Bulk delete via selection mode permanently deletes resumes with no undo mechanism. The single-delete flow at least has a confirmation dialog; bulk delete goes straight to `deleteMultipleResumes.mutate()` after a simple alert dialog.
- **Impact:** Users can accidentally wipe multiple resumes.
- **Fix:** Add an undo toast ("5 resumes deleted — Undo") that buffers the actual delete for 5-10 seconds, similar to Gmail.
- **Effort:** Medium

---

## Medium Issues

### M1 — Resume card border-left color doesn't match type (Visual inconsistency)
- **Component:** `ResumeListCard.tsx:230`
- **Issue:** All cards have `border-l-primary/20` (a faint crimson left border) regardless of resume type (master vs tailored). There's no visual distinction between a master resume and a tailored version at a glance.
- **Impact:** Users can't quickly distinguish master vs tailored resumes in the list.
- **Fix:** Tailored resumes should have a different left border color (e.g., `border-l-success/20` green) or no left border at all, while master resumes keep the primary color.
- **Effort:** Low

### M2 — Card swipe hint uses non-dismissible localStorage (Accessibility)
- **Component:** `ResumeListCard.tsx:98-114`
- **Issue:** The swipe hint overlay is shown once per browser (via `localStorage`), not per-session. If a user clears cookies but not localStorage, or uses incognito, they may never see the hint. Conversely, once dismissed on device A, a user on device B still sees it.
- **Impact:** Inconsistent onboarding experience.
- **Fix:** Track per-session with `sessionStorage` or show a subtle persistent indicator instead of a full overlay.
- **Effort:** Low

### M3 — Search placeholder changes based on tab but filter logic doesn't (UX confusion)
- **Component:** `DashboardPage.tsx:855`
- **Issue:** The search placeholder says "Search in My CVs..." or "Search in Tailored..." but the `filteredResumes` logic searches across ALL resumes before tab filtering. So a user on the "Tailored" tab searching for a master resume title will get no results, even though the placeholder suggests it's searching only in the current tab.
- **Impact:** Confusing empty results.
- **Fix:** Either filter by tab first then search, or update the placeholder to say "Search all resumes...".
- **Effort:** Low

### M4 — Profile banner shows dismiss button that's smaller than touch target (Accessibility)
- **Component:** `DashboardPage.tsx:753-759`
- **Issue:** The X dismiss button on the profile banner has `min-w-[44px] min-h-[44px]` but the parent container is a `button` styled with padding. However, the visual hit area (the X icon at `w-4 h-4`) is much smaller than 44×44px and might not register properly on some devices.
- **Impact:** Hard to dismiss on mobile.
- **Fix:** Ensure the entire `min-w-[44px] min-h-[44px]` area is clickable, not just the icon.
- **Effort:** Low

### M5 — `DashboardStats` login streak fetches on every mount (Performance)
- **Component:** `DashboardStats.tsx:40-78`
- **Issue:** `useLoginStreak` runs an Appwrite query on every component mount, even if the data hasn't changed. For returning users, this is an unnecessary network request on every dashboard visit.
- **Impact:** Extra latency on dashboard load, unnecessary backend load.
- **Fix:** Cache the streak in React Query or zustand with a reasonable stale time (e.g., 5 minutes).
- **Effort:** Medium

### M6 — Resume card action sheet has no keyboard trap (Accessibility)
- **Component:** `ResumeListCard.tsx:512-578`
- **Issue:** When the bottom action sheet opens, focus is not trapped inside it. A keyboard user can Tab out of the sheet into the background page while the sheet is still open.
- **Impact:** Screen reader and keyboard users get lost in focus order.
- **Fix:** Add a focus trap (using `react-focus-trap` or a custom hook) when the sheet is open.
- **Effort:** Medium

---

## Low Issues

### L1 — `useLoginStreak` has unused `Query` import (Lint noise)
- **Component:** `DashboardStats.tsx:7`
- **Issue:** `Query` is imported from `@/lib/appwrite` but never used in the file.
- **Fix:** Remove unused import.
- **Effort:** 1-line fix

### L2 — Motivational subtitle carousel runs even when resumes exist (Performance)
- **Component:** `DashboardStats.tsx:131-137`
- **Issue:** The `useEffect` for subtitle rotation has `if (totalResumes > 0) return;` but the effect still registers on mount, then cleans up immediately. Not a real bug, just slightly wasteful.
- **Fix:** Move the guard outside the effect registration.
- **Effort:** Low

### L3 — Empty state template previews have hardcoded `bg-white` (Dark mode bug)
- **Component:** `EmptyState.tsx:70`
- **Issue:** The `MiniTemplateThumbnail` wrapper has `className="... bg-white rounded-xl"` which will show a white background in dark mode.
- **Impact:** Minor visual inconsistency in dark mode.
- **Fix:** Use `bg-background` or `bg-card` instead.
- **Effort:** 1-line fix

### L4 — Trust banner close button lacks visual feedback (Polish)
- **Component:** `DashboardPage.tsx:731-737`
- **Issue:** The trust banner dismiss button has no hover/active states beyond the default button behavior. The X icon is `text-muted-foreground/50` which is very faint.
- **Fix:** Add hover state and increase icon opacity.
- **Effort:** Low

---

## Recommendations (Not Bugs, But Improvements)

1. **Re-enable filter UI or remove dead code** — The filter logic works but has no UI. Either add the filter bar back or strip the state to simplify the page.
2. **Add empty-state illustration** — The current empty state uses a text-based "No Resumes Yet" with a generic icon. A custom illustration would improve first-time experience.
3. **Add pull-to-refresh spinner visibility** — The `PullToRefresh` component wraps content but doesn't show a visible spinner during refresh on desktop.
4. **Resume card hover preview** — On desktop, hovering a resume card could show a mini preview or quick stats tooltip.
5. **Sort by "Last opened"** — Currently only sorts by updated/alpha/score. Users may want "most recently viewed".
