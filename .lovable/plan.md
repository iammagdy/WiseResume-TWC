
# Performance Analysis — WiseResume Full App Audit

## Methodology
Every screen's data-fetching chain, render guard, bundle loading strategy, and component composition was traced end-to-end. The findings are ordered from highest user-visible impact to lowest.

---

## Root Cause Summary

The app has very solid lazy-loading and skeleton foundations, but there are **6 specific bottlenecks** causing perceived slowness across different screens. None require architectural changes — all are targeted surgical fixes.

---

## Issues Found (Ordered by Impact)

### 1. CRITICAL — Dashboard Shows Skeleton Twice Back-to-Back

**Why it feels slow:** The Dashboard has a **two-stage loading gate**: it first waits for `authLoading` to resolve (handled by React Query + `AuthContext`), and then immediately fires a second **sequential** Supabase query to check `profiles.onboarding_completed`. Until BOTH resolve, it shows a full skeleton. On a fresh session this means:
- Auth resolves → skeleton still shown
- Onboarding check fires → skeleton still shown
- Onboarding resolves → UI appears

This creates a **double waterfall** that adds ~300–800ms of visible skeleton time on every Dashboard visit. The `profileLoaded` state starts as `false` and only becomes `true` after this secondary query.

**Where:** `DashboardPage.tsx` lines 108–132 (`checkOnboardingStatus` async effect) + line 438 (`if (authLoading || !profileLoaded)`).

**Fix:** Run the onboarding check in parallel with the resumes query by removing the `profileLoaded` guard and replacing the sequential `useEffect` with a separate React Query call. The resumes list can appear immediately while the onboarding check runs in the background. If onboarding is needed, overlay the carousel on top of the already-visible content (it's already a fixed overlay — this is safe).

**Files:** `src/pages/DashboardPage.tsx`

---

### 2. HIGH — Editor Has an 8-Second Bail-Out Timeout as First Experience

**Why it feels slow:** `EditorPage.tsx` lines 176–187 implement a safety bail-out: if `currentResume` isn't populated within 8 seconds, it redirects to dashboard. The issue is that the skeleton (`EditorSkeleton`) is shown during this entire window when the Zustand store hasn't hydrated yet, which happens on **every cold navigation to the editor** (first tab open, PWA launch, hard refresh).

The hydration sequence is:
1. Check `storeHydrated` (Zustand persist)
2. Validate resume ID exists in DB (`useResume`)
3. Run the hydration `useEffect` that copies DB data into the store
4. Only then: `currentResume` is truthy and content renders

Step 3 fires as an async side-effect AFTER the component renders, meaning there's always at least one extra render cycle of skeleton between DB fetch resolving and content appearing.

**Fix:** In the render guard, instead of waiting for `currentResume` to be in Zustand state (which requires an extra effect cycle), check `resumeFromDb` directly (which is already available from React Query by this point) and use it to render the page immediately. `currentResume` can continue to be used as the live editing state, but the initial hydration render should not need to wait for an effect.

**Files:** `src/pages/EditorPage.tsx`

---

### 3. HIGH — `useResume` Has `staleTime: 0` — Always Re-fetches on Editor Entry

**Why it feels slow:** `useResume()` in `useResumes.ts` line 150 sets `staleTime: 0`. This means every time the user enters the editor (navigating from Dashboard → Editor, or returning from Preview → Editor), the resume is re-fetched from the backend regardless of whether it's already cached. Combined with the hydration waterfall in Issue 2, this means the skeleton is always shown on editor entry.

For a local editing tool, the resume in the Zustand store IS the source of truth. The `useResume` query should be used for conflict detection only, not as the primary loading gate.

**Fix:** Increase `staleTime` for `useResume` from 0 to `30 * 1000` (30 seconds). Conflict detection still works because the `onAuthStateChange` / window-focus refetch will catch server-side changes. The user's own saves always invalidate the cache via `queryClient.invalidateQueries`.

**Files:** `src/hooks/useResumes.ts`

---

### 4. HIGH — Templates Page Renders All Thumbnails at Once

**Why it feels slow:** `TemplatesPage.tsx` renders a grid of **30 template thumbnails** (one for every template in the app). Each `TemplateThumbnail` component lazy-loads a full template React component, runs a `ResizeObserver`, and renders a scaled-down version of a full A4 page worth of DOM. Even though `useInView` is used per-thumbnail, all 30 `TemplateThumbnail` components mount simultaneously when the grid renders. This means 30 `ResizeObserver` instances and 30 `IntersectionObserver` instances are created at mount time.

Additionally, the grid uses `motion.button` with staggered animations for all 30 items (`delay: i * 0.03`) — this means `i * 0.03` goes up to 0.87s for the last item, making the page feel sluggish to populate even after data is available.

**Fix 1:** Virtualize the grid. Only mount thumbnails that are within the visible viewport ± 1 row. Since each thumbnail is fixed-height, this can be done with a simple windowing approach (render only the first 6 on mount, use `IntersectionObserver` on a sentinel to mount the next 6).

**Fix 2:** Reduce the stagger delay from `i * 0.03` to `Math.min(i * 0.03, 0.15)` — cap it so items beyond row 3 don't get increasingly delayed.

**Files:** `src/pages/TemplatesPage.tsx`

---

### 5. MEDIUM — Applications Page Makes 4 Parallel Queries on Mount (Waterfall Risk)

**Why it feels slow:** `ApplicationsPage.tsx` fires these queries simultaneously on mount:
- `useJobActivityStats()` 
- `useJobApplications()`
- `useJobs()`
- `useResumes()`
- `useUnreadNotificationCount()`
- A separate inline status-count query (line 114–126)

That's **6 queries**. While React Query fires them in parallel, the page shows a loading skeleton until the slowest one resolves. The status-count query at line 114 is particularly inefficient: it fetches the `status` column for **all** job applications every time the page mounts, as a separate round-trip, when this information is already available from `useJobApplications()`.

**Fix:** Compute status counts client-side from the `useJobApplications` data instead of firing a separate query. Replace the `useQuery` at line 114–126 with a `useMemo` derived from `applications`.

**Files:** `src/pages/ApplicationsPage.tsx`

---

### 6. MEDIUM — `useJobApplications` Has No `staleTime` — Refetches on Every Focus

**Why it feels slow:** `useJobApplications` has no `staleTime` set (inherits the QueryClient default of 5 minutes — wait, actually the global default is set in `App.tsx` as `staleTime: 5 * 60 * 1000`... but `useJobApplications` is called **twice** per page because it's called both with `statusFilter === 'all' ? undefined : statusFilter` AND `useJobs()` has its own fetch). However, neither `useJobs` nor `useJobApplications` sets a `staleTime`, so they pick up the global 5-minute staleTime. This is actually fine.

The real issue: the `ActivityTimeline` component inside the same page also fires its own 3 Supabase queries (`tailor_history`, `job_applications`, `cover_letters`, `resumes`) with no `staleTime` override. With the global 5-minute staleTime this is acceptable — **this one is actually NOT a major problem**.

**Revised Fix:** Keep the global 5-minute staleTime. No change needed here.

---

### 7. MEDIUM — `BottomTabBar` Calls `useResumes()` on Every Tab Navigation

**Why it feels slow:** `BottomTabBar.tsx` line 84 calls `useResumes()` directly. This hook is also called on `DashboardPage`, `ApplicationsPage`, and `BottomTabBar` simultaneously. While React Query deduplicates the network request, it means 3 consumers are subscribed to the same cache key. On every tab switch, the `BottomTabBar` re-renders because `useResumes` data reference changes (even if the data is identical), which triggers `isActive()` recalculation for all 5 tabs.

**Fix:** The `BottomTabBar` only needs `resumes[0]` to load the latest resume when the Editor tab is pressed without a current resume. Extract only `resumes?.[0]` with a `select` transformer to prevent re-renders when any resume other than the first changes.

**Files:** `src/components/layout/BottomTabBar.tsx`

---

### 8. LOW — `vite.config.ts` Has No Manual Chunk Splitting

**Why it matters:** Without `rollupOptions.output.manualChunks`, Vite bundles everything into a small number of large chunks. Heavy libraries like `framer-motion`, `pdf-lib`, `pdfjs-dist`, `mammoth`, `tesseract.js`, `docx`, and `recharts` all land in the same vendor chunk, making the initial JS download large even for users who will never generate a PDF or use OCR.

**Fix:** Add `manualChunks` to `vite.config.ts` to split heavy libraries into separate on-demand chunks:
- `pdf-chunk`: `pdf-lib`, `pdfjs-dist`
- `ai-chunk`: (already lazy via edge functions)
- `framer-chunk`: `framer-motion`
- `charts-chunk`: `recharts`
- `ocr-chunk`: `tesseract.js`, `mammoth`
- `docx-chunk`: `docx`

This ensures the initial app shell loads faster and these large libraries are only downloaded when the user actually opens the relevant feature.

**Files:** `vite.config.ts`

---

### 9. LOW — `changelog.json` Fetched on Every `BottomTabBar` Mount

**Why it matters:** `useChangelogBadge` fires a `fetch('/changelog.json')` every time the BottomTabBar mounts. Since the BottomTabBar is always mounted for protected routes, this fetch fires on every page load. The result is never cached across renders.

**Fix:** Add a simple module-level cache (`let cached: Promise<...> | null = null`) to the `useChangelogBadge` hook so the `changelog.json` is only fetched once per session.

**Files:** `src/hooks/useChangelogBadge.ts`

---

## Files to Change

| File | Change | Impact |
|---|---|---|
| `src/pages/DashboardPage.tsx` | Remove `profileLoaded` gate, parallelize onboarding check | Critical — removes double skeleton |
| `src/hooks/useResumes.ts` | Increase `useResume` staleTime to 30s | High — removes editor re-fetch on every entry |
| `src/pages/EditorPage.tsx` | Use `resumeFromDb` directly for initial render, reduce bail-out dependency | High — removes extra render cycle |
| `src/pages/TemplatesPage.tsx` | Cap stagger delay + lazy mount thumbnails beyond viewport | High — removes 0.87s animation stagger |
| `src/pages/ApplicationsPage.tsx` | Replace status-count query with `useMemo` from existing data | Medium — removes 1 extra network request |
| `src/components/layout/BottomTabBar.tsx` | Add `select` transformer to `useResumes` call | Medium — reduces re-render frequency |
| `src/hooks/useChangelogBadge.ts` | Module-level cache for changelog fetch | Low — removes per-mount fetch |
| `vite.config.ts` | Add `manualChunks` for heavy libraries | Low-Medium — reduces initial bundle size |

---

## What Is Already Excellent (No Change Needed)

- All pages use `lazyWithRetry` — correct and robust
- All 13 editor sections are lazy-loaded per tab — correct
- All heavy sheets (TailorSheet, AgenticChatSheet, RecruiterSimSheet) are lazy — correct
- `requestIdleCallback` used for background ATS scoring — correct
- `useDeferredValue` for search inputs on Dashboard and Applications — correct
- `useShallow` selector in EditorPage to prevent store-triggered re-renders — correct
- `content-visibility: auto` on editor sections (per memory) — correct
- 5-minute global staleTime + `refetchOnWindowFocus: false` — correct
- Inline loading spinner in `index.html` before React boots — correct
- `SpaceBackground` uses CSS-only stars (no Canvas RAF loop) — correct
- Template thumbnails use `useInView` with `rootMargin: '100px'` — correct
- `TemplateThumbnail` wrapped in `memo` — correct
