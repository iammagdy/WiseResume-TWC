

## Mobile Performance & Resilience Audit

### Current State

The app already has strong performance foundations: route-level code splitting via `lazyWithRetry`, lazy-loaded editor sections, lazy-loaded sheet/dialog components, `useDeferredValue` for search, `React.memo` on `ResumeListCard`, `useShallow` Zustand selectors in the Editor, and templates lazy-loaded in `LivePreviewPanel`. The architecture is solid.

### Identified Bottlenecks & Proposed Fixes

---

### 1. DashboardPage: `LinkedInImportSheet` and `AnalyzeJobSheet` Always Rendered

**Problem:** `LinkedInImportSheet` (line 680) is rendered unconditionally -- not wrapped in `{showLinkedInImport && ...}` or `<Suspense>`. Although it's declared with `lazy()` at the top, the JSX mounts it every render. `AnalyzeJobSheet` (line 730) has the same issue.

**Fix:** Wrap both in conditional rendering gates:
```tsx
{showLinkedInImport && (
  <Suspense fallback={null}>
    <LinkedInImportSheet ... />
  </Suspense>
)}
{showAnalyzeJob && (
  <Suspense fallback={null}>
    <AnalyzeJobSheet ... />
  </Suspense>
)}
```
**Impact:** Eliminates unnecessary chunk loads on dashboard entry.

---

### 2. `pdfGenerator.ts` Eagerly Imported in Multiple Pages

**Problem:** `pdfGenerator.ts` (1119 lines) imports `html2canvas` and `pdf-lib` at the top level. It's eagerly imported in `PreviewPage`, `ResumeDetailPage`, `LivePreviewPanel`, and `ShareSheet`. These are heavy libraries (~200KB combined) that load even if the user never exports.

**Fix:** Convert static imports to dynamic `import()` at call sites. The `ResumeListCard` already does this correctly (line 361: `const { generatePDF } = await import('@/lib/pdfGenerator')`). Apply the same pattern to:
- `PreviewPage.tsx` line 30: move the import inside the export handler function
- `LivePreviewPanel.tsx` line 6: move inside the download handler
- `ShareSheet.tsx` line 7: move inside the share handler

`ResumeDetailPage.tsx` can remain since it's already a lazy route.

**Impact:** Removes ~200KB from the initial chunk of the Editor and Preview routes.

---

### 3. `framer-motion` Imported in 78+ Components

**Problem:** `framer-motion` is used in 78 component files. At ~130KB minified, it's likely the largest single dependency in the bundle. Since it's used everywhere including the landing page (`Index.tsx`), it cannot be lazy-loaded. However, some uses are trivial (e.g., just `motion.div` with `initial/animate` for a simple fade) and could use CSS instead.

**Fix (targeted):** No changes recommended for now. The library is too widely used to remove, and tree-shaking already handles unused exports. This is an acceptable cost for the animation quality it provides.

**Status:** Acceptable, monitor bundle size.

---

### 4. `DashboardPage`: Background Resume Scoring Runs Eagerly

**Problem:** The `useEffect` at line 121 iterates all resumes and calls `scoreResume()` for each one sequentially after a 1-second delay. On a throttled mobile CPU with many resumes, this can cause jank during initial dashboard load.

**Fix:** Add a `requestIdleCallback` wrapper around the scoring loop so it yields to the main thread between scores:
```tsx
const scoreNext = async () => {
  for (const resume of resumes) {
    if (cancelled) break;
    // Yield to main thread between scores
    await new Promise(r => 
      'requestIdleCallback' in window 
        ? requestIdleCallback(r) 
        : setTimeout(r, 50)
    );
    // ...existing scoring logic
  }
};
```
**Impact:** Eliminates scroll jank during background scoring on low-end devices.

---

### 5. Editor `renderEditorContent` Recreates on Every Render

**Problem:** `renderEditorContent` at line 566 is wrapped in `useCallback` but has `[activeTab, sectionScores, moreSubSection, steps, handleTabChange, navigate]` as dependencies. Since `sectionScores` is a new object on every `currentResume` change (even if scores haven't changed), the callback recreates frequently.

**Fix:** No change needed. The `useMemo` on `sectionScores` (line 379) already memoizes the object, and the section components are lazy-loaded with Suspense. The render cost is minimal since only the active tab's component mounts.

**Status:** Acceptable.

---

### 6. `ResumeListCard`: `resumeForProgress` Recalculated on Every Render

**Problem:** Line 89: `const resumeForProgress = useMemo(() => dbToResumeData(resume), [resume])`. The `resume` object from the query changes reference on every refetch even if data hasn't changed, causing `dbToResumeData` to run unnecessarily.

**Fix:** Use a stable key like `resume.updated_at`:
```tsx
const resumeForProgress = useMemo(
  () => dbToResumeData(resume), 
  [resume.id, resume.updated_at]
);
```
**Impact:** Prevents unnecessary progress bar recalculations after pull-to-refresh.

---

### 7. Network Resilience: `lazyWithRetry` Does Not Wait for Network

**Problem:** If a user is offline when navigating to a new route, `lazyWithRetry` retries after 1.5s blindly. If still offline, the error propagates to ErrorBoundary.

**Fix:** Enhance `lazyWithRetry` to check `navigator.onLine` and wait for the `online` event before retrying:
```tsx
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch(() => {
      return new Promise<{ default: T }>((resolve, reject) => {
        const attemptRetry = () => {
          setTimeout(() => factory().then(resolve).catch(reject), 1500);
        };
        if (!navigator.onLine) {
          const handler = () => {
            window.removeEventListener('online', handler);
            attemptRetry();
          };
          window.addEventListener('online', handler);
          // Timeout after 30s even if still offline
          setTimeout(() => {
            window.removeEventListener('online', handler);
            factory().then(resolve).catch(reject);
          }, 30000);
        } else {
          attemptRetry();
        }
      });
    })
  );
}
```
**Impact:** Prevents error screens when user temporarily loses connectivity during navigation.

---

### 8. PreviewPage: Missing Lazy Templates (Only 12 of 29)

**Problem:** `PreviewPage` only lazy-loads 12 templates (lines 11-22), but `LivePreviewPanel` loads all 29. If a user selects a template not in PreviewPage's list (e.g., Corporate, Banking, Federal, etc.), the preview may fail or show a blank.

**Fix:** Add the missing 17 template lazy imports to `PreviewPage`, matching `LivePreviewPanel`'s full list.

**Impact:** Prevents blank preview for users with non-standard templates.

---

### Summary of Changes

| File | Change | Priority | Effort |
|------|--------|----------|--------|
| `src/pages/DashboardPage.tsx` | Gate `LinkedInImportSheet` and `AnalyzeJobSheet` rendering | High | Small |
| `src/pages/PreviewPage.tsx` | Dynamic import `pdfGenerator` in export handler | High | Small |
| `src/components/editor/LivePreviewPanel.tsx` | Dynamic import `pdfGenerator` in download handler | High | Small |
| `src/components/editor/ShareSheet.tsx` | Dynamic import `pdfGenerator` in share handler | High | Small |
| `src/pages/DashboardPage.tsx` | Add `requestIdleCallback` to background scoring | Medium | Small |
| `src/components/dashboard/ResumeListCard.tsx` | Stabilize `resumeForProgress` memoization key | Medium | Tiny |
| `src/lib/lazyWithRetry.ts` | Network-aware retry with `online` event listener | Medium | Small |
| `src/pages/PreviewPage.tsx` | Add missing 17 template lazy imports | High | Small |

### What Won't Change

- No business logic modifications
- No changes to data models or API calls
- `framer-motion` stays (too deeply integrated, acceptable bundle cost)
- Editor's Zustand selectors and `useShallow` patterns are already optimized
- Template lazy-loading in `LivePreviewPanel` is already correct
- All existing features preserved

