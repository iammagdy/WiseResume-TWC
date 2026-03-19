# Tasks: UI/UX & Front-End Performance Audit (Round 1)

**Input**: Design documents from `specs/018-ui-ux-performance-audit/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Already Resolved (DO NOT implement — these are done):**
- ~~UX-003 Dashboard empty state~~ — Already exists in `src/pages/DashboardPage.tsx` (EmptyState component)
- ~~UX-004 Applications empty state~~ — Already exists in `src/pages/ApplicationsPage.tsx` (multiple empty states)
- ~~UX-006 Editor unsaved changes~~ — Already exists in `src/pages/EditorPage.tsx` (beforeunload + useUnsavedChangesGuard + UnsavedChangesDialog)
- ~~PERF-003 pdfjs-dist lazy load~~ — Already split into `pdf` chunk via `vite.config.ts` line 30
- ~~PERF-004 tesseract.js lazy load~~ — Already split into `ocr` chunk via `vite.config.ts` line 31
- ~~PERF-005 three.js/SkyWallpaperCanvas lazy load~~ — Already lazy-loaded via `React.lazy()` in `src/components/ui/SkyWallpaper.tsx` line 23
- ~~VersionHistorySheet broad destructuring~~ — Already uses individual selectors at lines 30-31

---

## Phase 1: Global Styles & Primitives (Setup)

**Purpose**: Establish global a11y improvements. No new component file needed (existing button.tsx already has correct patterns).

### [x] T001 [P] Add global focus-visible styles to `src/index.css`

**What to do**: Add a CSS rule at the end of `src/index.css` that ensures all interactive elements show a visible focus ring when navigated via keyboard.

**Exact change**: Append this CSS block to the END of the file `src/index.css`:

```css
/* ── A11y: Global focus-visible ring for keyboard navigation ───────── */
@layer base {
  :focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }
}
```

**Why**: Without this, keyboard-only users can't see which element is focused. The `focus-visible` pseudo-class only triggers for keyboard navigation (not mouse clicks), so it won't add annoying outlines on mouse clicks.

**Verify**: Open the app, press Tab repeatedly — every button/link/input should show a colored outline.

---

### [x] T002 [P] Fix placeholder text contrast in `src/index.css`

**What to do**: Add a CSS rule to increase placeholder text opacity from the Tailwind default (which can be too low for WCAG compliance).

**Exact change**: Append this CSS block to the END of `src/index.css` (after the focus-visible rule from T001):

```css
/* ── A11y: Ensure placeholder text meets WCAG 4.5:1 contrast ──────── */
@layer base {
  ::placeholder {
    opacity: 0.75;
  }
}
```

**Why**: The default placeholder opacity (~60%) fails WCAG 2.1 AA contrast requirements. 75% provides sufficient contrast while still visually distinguishing placeholder from real input.

**Verify**: Look at any text input's placeholder text — it should be clearly readable but still lighter than typed text.

---

### [x] T003 [P] Fix disabled button opacity in `src/components/ui/button.tsx`

**What to do**: The button component already uses `disabled:opacity-50` (line 8). **This task is already done.** Verify by reading line 8 of `src/components/ui/button.tsx` — it contains `disabled:pointer-events-none disabled:opacity-50`. If it says `disabled:opacity-50`, mark this task complete with no changes.

**Current code at line 8**:
```
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97] touch-manipulation",
```

**Result**: Already has `disabled:opacity-50`. ✅ No change needed.

---

**Phase 1 Checkpoint**: Open the app, press Tab through interactive elements — focus rings should be visible. Check any form input placeholder — should be clearly readable.

---

## Phase 2: Critical Loading States (P1)

**Purpose**: Replace `return null` loading paths with inline skeleton components so users never see a blank page.

### [x] T004 [S] Fix EditorPage loading states in `src/pages/EditorPage.tsx`

**What to do**: Replace every `return null` in the guard block (lines 561-570) with `return <EditorSkeleton />`. The `EditorSkeleton` component already exists and is already imported via `PageSkeletons.tsx`.

**Step 1**: Check if `EditorSkeleton` is already imported. Search the file for `EditorSkeleton`. If NOT imported, add this import near the top of the file:
```typescript
import { EditorSkeleton } from '@/components/layout/PageSkeletons';
```

**Step 2**: Find the guard block (around lines 558-571). It currently looks like this:
```typescript
  // === GUARDS (all inline, no effects — deterministic) ===
  // Suspense fallback already shows EditorSkeleton during chunk load;
  // return null here to avoid a jarring skeleton→skeleton reset.
  if (authLoading) return null;
  // Auth guard handled by ProtectedRoute
  if (!storeHydrated) return null;
  if (!currentResumeId && !currentResume) return <Navigate to="/dashboard" replace />;
  // Show skeleton while DB fetch is in flight — but as soon as resumeFromDb arrives,
  // the hydration effect will fire and populate currentResume in the same micro-task tick.
  // This reduces perceived wait by one full render cycle vs waiting for the effect.
  if (!currentResume && isValidating) return null;
  if (!currentResume && !resumeFromDb) return null;
  if (!currentResume) return null;
  // === Past this point, currentResume is guaranteed non-null ===
```

**Step 3**: Replace every `return null` with `return <EditorSkeleton />`. Update the comment to reflect the change. The `<Navigate>` line stays unchanged. Result should be:

```typescript
  // === GUARDS (all inline, no effects — deterministic) ===
  if (authLoading) return <EditorSkeleton />;
  if (!storeHydrated) return <EditorSkeleton />;
  if (!currentResumeId && !currentResume) return <Navigate to="/dashboard" replace />;
  if (!currentResume && isValidating) return <EditorSkeleton />;
  if (!currentResume && !resumeFromDb) return <EditorSkeleton />;
  if (!currentResume) return <EditorSkeleton />;
  // === Past this point, currentResume is guaranteed non-null ===
```

**DO NOT** change anything else in this file. Do not modify the component's logic, hooks, or JSX below the guard block.

**Verify**: Navigate to `/editor` — you should see the skeleton layout (pulsing gray boxes) while data loads, never a blank white screen.

---

### [x] T005 [P] Fix JobDetailPage loading state in `src/pages/JobDetailPage.tsx`

**What to do**: Replace `return null` on line 28 with an inline skeleton loader.

**Step 1**: Add this import at the top of the file (after the existing imports):
```typescript
import { DetailSkeleton } from '@/components/layout/PageSkeletons';
```

**Step 2**: Find line 28:
```typescript
  if (isLoading) return null;
```

**Step 3**: Replace with:
```typescript
  if (isLoading) return <DetailSkeleton />;
```

**DO NOT** change anything else in this file.

**Verify**: Navigate to a job detail page — you should see the skeleton layout while loading, not a blank screen.

---

**Phase 2 Checkpoint**: Both pages show skeletons during load. Test with Chrome DevTools Network throttling set to "Slow 3G" to clearly see the skeletons.

---

## Phase 3: Accessibility — Aria Labels (P1)

**Purpose**: Add descriptive `aria-label` attributes to all icon-only buttons so screen readers can announce them.

### [x] T006 [S] Audit all icon-only buttons

**What to do**: Search the codebase for buttons that contain only an icon (no visible text) and lack an `aria-label`. This is a research task — produce a list, then fix in T007-T009.

**How to find them**: An icon-only button typically looks like one of these patterns:
```tsx
<Button size="icon" onClick={...}><Trash2 className="..." /></Button>
<Button variant="ghost" size="icon"><X className="..." /></Button>
<button onClick={...}><Edit className="..." /></button>
```

The key indicator is `size="icon"` on the Button component, OR a button/Button with only an SVG/icon child and no text.

**Search commands to run**:
1. Search for `size="icon"` across all `.tsx` files in `src/`
2. Search for `size='icon'` (single quotes variant)
3. Also check for `<button` elements with only icon children

**Output**: A list of files and approximate line numbers that need `aria-label` added. Group by directory.

---

### [x] T007 [P][After T006] Add `aria-label` to icon-only buttons in `src/components/editor/`

**What to do**: For every icon-only button found in T006 within `src/components/editor/` and its subdirectories, add a descriptive `aria-label` prop.

**Pattern to follow**: Choose a label that describes the ACTION the button performs, not the icon name.

**Examples of correct aria-labels**:
```tsx
// BEFORE (bad — screen reader says just "button"):
<Button size="icon" variant="ghost" onClick={handleDelete}>
  <Trash2 className="w-4 h-4" />
</Button>

// AFTER (good — screen reader says "Delete item"):
<Button size="icon" variant="ghost" onClick={handleDelete} aria-label="Delete item">
  <Trash2 className="w-4 h-4" />
</Button>
```

**Common icon-to-label mappings** (use context-appropriate labels):
| Icon | Typical aria-label |
|------|-------------------|
| `X` / `XCircle` | `"Close"` or `"Close dialog"` |
| `Trash2` / `Trash` | `"Delete"` + what (e.g., `"Delete entry"`) |
| `Edit` / `Pencil` / `PenSquare` | `"Edit"` + what |
| `Plus` / `PlusCircle` | `"Add"` + what |
| `Copy` / `Clipboard` | `"Copy to clipboard"` |
| `ChevronLeft` / `ArrowLeft` | `"Go back"` |
| `ChevronDown` / `ChevronUp` | `"Expand"` / `"Collapse"` |
| `Settings` / `Sliders` / `SlidersHorizontal` | `"Settings"` or `"Customize"` |
| `Share2` | `"Share"` |
| `Download` | `"Download"` |
| `Eye` / `EyeOff` | `"Show preview"` / `"Hide preview"` |
| `RotateCcw` | `"Undo"` or `"Restore"` |
| `Save` | `"Save"` |
| `Sparkles` | `"AI enhance"` or similar context |
| `MoreVertical` / `MoreHorizontal` | `"More options"` |
| `GripVertical` | `"Drag to reorder"` |
| `Bookmark` / `BookmarkCheck` | `"Save job"` / `"Unsave job"` |
| `Pin` | `"Pin version"` |
| `GitCompare` | `"Compare versions"` |

**Rules**:
- Only add `aria-label` to buttons that have NO visible text child
- If a button already has `aria-label`, leave it alone
- If a button has visible text (even alongside an icon), it does NOT need `aria-label`
- Use lowercase for the label (except proper nouns)
- Be specific: "Delete experience entry" is better than just "Delete"

**DO NOT** change anything else about the buttons (no styling, no logic changes).

---

### [x] T008 [P][After T006] Add `aria-label` to icon-only buttons in `src/components/dashboard/`

**What to do**: Same as T007, but for all files in `src/components/dashboard/` directory. Follow the exact same pattern and rules from T007.

---

### [x] T009 [P][After T006] Add `aria-label` to remaining icon-only buttons

**What to do**: Same as T007, but for all remaining files found in T006 that are NOT in `src/components/editor/` or `src/components/dashboard/`. This includes:
- `src/components/portfolio/`
- `src/components/settings/`
- `src/components/ui/`
- `src/components/interview/`
- `src/components/career/`
- `src/pages/` (any icon-only buttons in page files)

Follow the exact same pattern and rules from T007.

---

**Phase 3 Checkpoint**: Use a screen reader or browser accessibility inspector. Tab to any icon button — it should announce a meaningful label like "Delete entry" instead of just "button".

---

## Phase 4: Unsaved Changes Protection (P2)

**Purpose**: Add unsaved changes warning to PortfolioEditorPage, matching the pattern already used in EditorPage.

### [x] T010 [S] Add unsaved changes protection to `src/pages/PortfolioEditorPage.tsx`

**What to do**: The PortfolioEditorPage has NO unsaved changes protection. We need to add both `beforeunload` (for browser close/refresh) and an in-app navigation dialog (for clicking links within the app). We'll adapt the approach for portfolio's state shape (multiple individual state vars, not a single resumeRef).

**Context**: Unlike EditorPage (which tracks changes via `resumeRef` vs `lastSavedResumeRef`), PortfolioEditorPage uses ~30 individual `useState` vars. The simplest dirty-tracking approach is to snapshot the state after profile loads, then compare current state on navigation.

**Step 1**: Add imports at the top of `src/pages/PortfolioEditorPage.tsx`:
```typescript
import { useNavigate } from 'react-router-dom';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
```
Note: Check if `useNavigate` is already imported. If yes, skip it.

**Step 2**: Inside the component function (after the existing state declarations around line 93), add dirty-tracking state:
```typescript
  // ── Unsaved changes tracking ──
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const [isSavingBeforeLeave, setIsSavingBeforeLeave] = useState(false);
  const navigate = useNavigate();
```
Note: Check if `navigate` is already declared. If yes, only add the 3 new state lines.

**Step 3**: Create a helper function that captures the current portfolio state as a JSON string, placed right after the state declarations:
```typescript
  const getCurrentSnapshot = useCallback(() => {
    return JSON.stringify({
      username, bio, portfolioEnabled, githubUrl, websiteUrl, twitterUrl,
      linkedinUrl, contactEmail, selectedTheme, sections, metaTitle,
      metaDescription, portfolioStyle, portfolioLayout, portfolioAccentColor,
      portfolioFont, openToWork, availabilityHeadline, syncMode,
      caseStudies, services, testimonials, highlights, portfolioSummary,
      selectedResumeId,
    });
  }, [
    username, bio, portfolioEnabled, githubUrl, websiteUrl, twitterUrl,
    linkedinUrl, contactEmail, selectedTheme, sections, metaTitle,
    metaDescription, portfolioStyle, portfolioLayout, portfolioAccentColor,
    portfolioFont, openToWork, availabilityHeadline, syncMode,
    caseStudies, services, testimonials, highlights, portfolioSummary,
    selectedResumeId,
  ]);
```

**Step 4**: Add an effect to capture the initial snapshot when profile loads. Place this right after the existing `useEffect` that syncs `profile → local state` (currently around line 110-138):
```typescript
  // Capture snapshot after profile syncs to local state
  useEffect(() => {
    if (profile && !lastSavedSnapshot) {
      // Delay by 1 tick so all setState calls from the profile sync effect have flushed
      const id = requestAnimationFrame(() => setLastSavedSnapshot(getCurrentSnapshot()));
      return () => cancelAnimationFrame(id);
    }
  }, [profile, lastSavedSnapshot, getCurrentSnapshot]);
```

**Step 5**: Update `lastSavedSnapshot` after a successful save. Find the `handleSave` function (around line 290). After the `toast.success('Portfolio saved!')` line (around line 352), add:
```typescript
      setLastSavedSnapshot(getCurrentSnapshot());
```

**Step 6**: Add `beforeunload` handler. Place this after the snapshot effect from Step 4:
```typescript
  // Browser close/refresh warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [lastSavedSnapshot, getCurrentSnapshot]);
```

**Step 7**: Add in-app navigation interception. Place this after the beforeunload effect:
```typescript
  // In-app navigation guard
  const handleNavigateAway = useCallback((path: string) => {
    if (lastSavedSnapshot && getCurrentSnapshot() !== lastSavedSnapshot) {
      setPendingNavPath(path);
    } else {
      navigate(path);
    }
  }, [lastSavedSnapshot, getCurrentSnapshot, navigate]);

  const handleSaveAndLeave = useCallback(async () => {
    if (!pendingNavPath) return;
    setIsSavingBeforeLeave(true);
    try {
      await handleSave();
      const path = pendingNavPath;
      setPendingNavPath(null);
      navigate(path);
    } catch {
      setPendingNavPath(null);
    } finally {
      setIsSavingBeforeLeave(false);
    }
  }, [pendingNavPath, handleSave, navigate]);
```

**Step 8**: Add the `UnsavedChangesDialog` to the JSX. Find the closing tags at the very end of the component's return statement. Just before the final closing `</>` or `</div>`, add:
```tsx
      <UnsavedChangesDialog
        open={pendingNavPath !== null}
        isSaving={isSavingBeforeLeave}
        onSaveAndLeave={handleSaveAndLeave}
        onDiscard={() => {
          const path = pendingNavPath;
          setPendingNavPath(null);
          if (path) navigate(path);
        }}
        onCancel={() => setPendingNavPath(null)}
      />
```

**Step 9**: Find the `BackButton` component in the JSX (it should navigate to dashboard). If it uses `navigate('/dashboard')` or a link, replace that navigation with `handleNavigateAway('/dashboard')`. Look for something like:
```tsx
<BackButton onClick={() => navigate('/dashboard')} />
```
Change to:
```tsx
<BackButton onClick={() => handleNavigateAway('/dashboard')} />
```
If BackButton uses a `to` prop (Link-style), you'll need to change it to use `onClick` with `handleNavigateAway` instead.

**DO NOT** change any other logic in the file. Do not modify the save function's core logic, the profile sync, or any UI besides adding the dialog and updating the back button.

**Verify**:
1. Edit any field (e.g., bio) → click Back → dialog should appear with "Save & Leave" / "Discard" / "Cancel"
2. Edit any field → close/refresh browser tab → browser's native "Leave site?" dialog should appear
3. Save → click Back → NO dialog (clean state)

---

**Phase 4 Checkpoint**: PortfolioEditorPage warns before losing unsaved changes on both browser close and in-app navigation.

---

## Phase 5: Heavy Library Lazy Loading (P2)

**Purpose**: Ensure three.js and html2canvas are in separate build chunks, not in the main bundle.

### [x] T011 [S] Add three.js and html2canvas to Vite chunk splitting in `vite.config.ts`

**What to do**: The `SkyWallpaperCanvas` component is already lazy-loaded via `React.lazy()` (confirmed in `src/components/ui/SkyWallpaper.tsx` line 23). However, `three.js` and `html2canvas` are NOT listed in `vite.config.ts` `manualChunks`, so Vite may bundle them into the main chunk or a shared chunk.

**Find** the `manualChunks` function in `vite.config.ts` (around lines 27-36). It currently looks like:
```typescript
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'framer';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts';
          if (id.includes('node_modules/pdf-lib') || id.includes('node_modules/pdfjs-dist')) return 'pdf';
          if (id.includes('node_modules/tesseract') || id.includes('node_modules/mammoth')) return 'ocr';
          if (id.includes('node_modules/docx')) return 'docr';
          if (id.includes('node_modules/qr-code-styling')) return 'qr';
          if (id.includes('node_modules/react-image-crop')) return 'image-crop';
          if (id.includes('node_modules/@radix-ui')) return 'radix';
        },
```

**Add** these two lines BEFORE the closing `},`:
```typescript
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three';
          if (id.includes('node_modules/html2canvas')) return 'html2canvas';
```

**DO NOT** change anything else in this file.

---

### [x] T012 [S] Convert html2canvas to dynamic import in `src/lib/html2canvasRetry.ts`

**What to do**: The file currently has a static `import html2canvas from 'html2canvas'` at line 1. This pulls html2canvas into whatever chunk imports `html2canvasRetry.ts`. We need to convert it to a dynamic import so html2canvas only loads when actually needed.

**Step 1**: Remove the static import at line 1:
```typescript
// REMOVE THIS LINE:
import html2canvas from 'html2canvas';
```

**Step 2**: Find the `captureWithRetry` function (around line 107). Inside the function, find where `html2canvas` is called (around line 151):
```typescript
        html2canvas(element, opts as Parameters<typeof html2canvas>[1]),
```

**Step 3**: Add a dynamic import at the start of the `captureWithRetry` function body, right after the function signature:
```typescript
export async function captureWithRetry(
  element: HTMLElement,
  baseOptions: Record<string, unknown> = {},
  maxAttempts = 3,
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas');
  // ... rest of function unchanged
```

**Step 4**: The `Parameters<typeof html2canvas>[1]` type reference will no longer work since `html2canvas` is now a local variable. Change the cast to `any`:
```typescript
        html2canvas(element, opts as any),
```

**DO NOT** change any other functions in this file (`tagSvgDimensions`, `convertSvgsToImages`). They do not use `html2canvas` directly.

**Verify**: Run `npx vite build` — the output should show a separate `html2canvas-XXXX.js` chunk.

---

### [x] T013 [S] Verify build output

**What to do**: Run the Vite build and check the output chunk files.

**Command**: `npx vite build`

**Expected**: The build output should list separate chunks for:
- `three-XXXX.js` (three.js / @react-three)
- `html2canvas-XXXX.js`
- `pdf-XXXX.js` (already existing)
- `ocr-XXXX.js` (already existing)

**Verify**: None of these libraries appear in the main `index-XXXX.js` chunk. If the build fails, fix any TypeScript errors introduced by T012.

---

**Phase 5 Checkpoint**: Build succeeds. Heavy libraries are in separate chunks. Initial bundle size should be smaller.

---

## Phase 6: Performance — Query Caching & Store Selectors (P2-P3, editor only)

**Purpose**: Reduce unnecessary API refetches and Zustand re-renders in editor components.

### [x] T014 [P] Add staleTime/gcTime to `src/hooks/useJobApplications.ts`

**What to do**: The `useQuery` call in `useJobApplications` (line 29) has no `staleTime`, so React Query refetches on every mount. Add caching config.

**Find** the `useQuery` call (around line 29):
```typescript
  return useQuery({
    queryKey: ['job-applications', user?.id, statusFilter],
    queryFn: async () => {
```

**Add** `staleTime` and `gcTime` after `enabled`:
```typescript
  return useQuery({
    queryKey: ['job-applications', user?.id, statusFilter],
    queryFn: async () => {
      // ... existing code unchanged
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,  // 5 minutes — don't refetch on every mount
    gcTime: 10 * 60 * 1000,    // 10 minutes — keep in cache after unmount
  });
```

**Also** do the same for `usePendingReminders` in the same file (if it has a `useQuery` without `staleTime`). Add:
```typescript
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 5 * 60 * 1000,
```

**DO NOT** change the query keys, query functions, or any other logic.

---

### [x] T015 [P] Convert `src/components/editor/JobAnalysisSheet.tsx` to useShallow

**What to do**: Line 30-40 uses broad destructuring: `const { currentResume, jobDescription, ... } = useResumeStore()`. This causes the component to re-render on ANY store change. Convert to `useShallow`.

**Step 1**: Add the import at the top:
```typescript
import { useShallow } from 'zustand/react/shallow';
```

**Step 2**: Find the broad destructuring (around lines 30-40):
```typescript
  const {
    currentResume,
    jobDescription,
    setJobDescription,
    matchScore,
    setMatchScore,
    gapAnalysis,
    setGapAnalysis,
    isAnalyzing,
    setIsAnalyzing
  } = useResumeStore();
```

**Step 3**: Replace with `useShallow`:
```typescript
  const {
    currentResume,
    jobDescription,
    setJobDescription,
    matchScore,
    setMatchScore,
    gapAnalysis,
    setGapAnalysis,
    isAnalyzing,
    setIsAnalyzing
  } = useResumeStore(useShallow((s) => ({
    currentResume: s.currentResume,
    jobDescription: s.jobDescription,
    setJobDescription: s.setJobDescription,
    matchScore: s.matchScore,
    setMatchScore: s.setMatchScore,
    gapAnalysis: s.gapAnalysis,
    setGapAnalysis: s.setGapAnalysis,
    isAnalyzing: s.isAnalyzing,
    setIsAnalyzing: s.setIsAnalyzing,
  })));
```

**DO NOT** change any other code in the file.

---

### [x] T016 [P] Convert `src/components/editor/TemplateSelector.tsx` to useShallow

**Step 1**: Add import:
```typescript
import { useShallow } from 'zustand/react/shallow';
```

**Step 2**: Find line 29:
```typescript
  const { selectedTemplate, setSelectedTemplate, updateResume, currentResume } = useResumeStore();
```

**Step 3**: Replace with:
```typescript
  const { selectedTemplate, setSelectedTemplate, updateResume, currentResume } = useResumeStore(useShallow((s) => ({
    selectedTemplate: s.selectedTemplate,
    setSelectedTemplate: s.setSelectedTemplate,
    updateResume: s.updateResume,
    currentResume: s.currentResume,
  })));
```

---

### [x] T017 [P] Convert `src/components/editor/tailor/CoverLetterGenerator.tsx` to useShallow

**Step 1**: Add import:
```typescript
import { useShallow } from 'zustand/react/shallow';
```

**Step 2**: Find the broad destructuring (around lines 95-101):
```typescript
  const {
    setGeneratedCoverLetter,
    addCoverLetterHistory,
    coverLetterHistory,
    deleteCoverLetterHistoryEntry,
    clearCoverLetterHistory,
  } = useResumeStore();
```

**Step 3**: Replace with:
```typescript
  const {
    setGeneratedCoverLetter,
    addCoverLetterHistory,
    coverLetterHistory,
    deleteCoverLetterHistoryEntry,
    clearCoverLetterHistory,
  } = useResumeStore(useShallow((s) => ({
    setGeneratedCoverLetter: s.setGeneratedCoverLetter,
    addCoverLetterHistory: s.addCoverLetterHistory,
    coverLetterHistory: s.coverLetterHistory,
    deleteCoverLetterHistoryEntry: s.deleteCoverLetterHistoryEntry,
    clearCoverLetterHistory: s.clearCoverLetterHistory,
  })));
```

---

### [x] T018 [P] Convert `src/components/editor/tailor/MultiJobCompareSheet.tsx` to useShallow

**Step 1**: Add import:
```typescript
import { useShallow } from 'zustand/react/shallow';
```

**Step 2**: Find the broad destructuring (around lines 32-38):
```typescript
  const {
    currentComparison,
    selectBestJob,
    removeJobFromComparison,
    applySelectedJob,
    clearComparison
  } = useResumeStore();
```

**Step 3**: Replace with:
```typescript
  const {
    currentComparison,
    selectBestJob,
    removeJobFromComparison,
    applySelectedJob,
    clearComparison
  } = useResumeStore(useShallow((s) => ({
    currentComparison: s.currentComparison,
    selectBestJob: s.selectBestJob,
    removeJobFromComparison: s.removeJobFromComparison,
    applySelectedJob: s.applySelectedJob,
    clearComparison: s.clearComparison,
  })));
```

---

### [x] T019 [P] Convert remaining editor sheets to useShallow

**What to do**: Apply the exact same pattern from T015-T018 to these components. Each one has `= useResumeStore()` with object destructuring. Add `import { useShallow } from 'zustand/react/shallow'` and wrap the selector.

**Files and their current destructuring**:

1. **`src/components/editor/AIHubSheet.tsx`** (line 107):
   ```typescript
   const { currentComparison } = useResumeStore();
   ```
   Replace with:
   ```typescript
   const { currentComparison } = useResumeStore(useShallow((s) => ({ currentComparison: s.currentComparison })));
   ```

2. **`src/components/editor/CareerPathSheet.tsx`** (line 237):
   ```typescript
   const { currentResume } = useResumeStore();
   ```
   Replace with:
   ```typescript
   const currentResume = useResumeStore((s) => s.currentResume);
   ```
   Note: For single-field access, use a direct selector instead of `useShallow` (simpler).

3. **`src/components/editor/ai/RecruiterSimSheet.tsx`** (line 49):
   ```typescript
   const { currentResume, updateResume } = useResumeStore();
   ```
   Replace with:
   ```typescript
   const { currentResume, updateResume } = useResumeStore(useShallow((s) => ({ currentResume: s.currentResume, updateResume: s.updateResume })));
   ```

4. **`src/components/editor/ai/OnePageWizardSheet.tsx`** (line 72):
   ```typescript
   const { currentResume, updateResume } = useResumeStore();
   ```
   Replace with:
   ```typescript
   const { currentResume, updateResume } = useResumeStore(useShallow((s) => ({ currentResume: s.currentResume, updateResume: s.updateResume })));
   ```

5. **`src/components/editor/ai/LinkedInOptimizerSheet.tsx`** (line 111):
   ```typescript
   const { currentResume } = useResumeStore();
   ```
   Replace with:
   ```typescript
   const currentResume = useResumeStore((s) => s.currentResume);
   ```

6. **`src/components/editor/ai/AIDetectorSheet.tsx`** (line 237):
   ```typescript
   const { currentResume, updateResume } = useResumeStore();
   ```
   Replace with:
   ```typescript
   const { currentResume, updateResume } = useResumeStore(useShallow((s) => ({ currentResume: s.currentResume, updateResume: s.updateResume })));
   ```

7. **`src/components/editor/AgenticChatSheet.tsx`** (line 244):
   ```typescript
   const { currentResume, setCurrentResume, setCurrentResumeId } = useResumeStore();
   ```
   Replace with:
   ```typescript
   const { currentResume, setCurrentResume, setCurrentResumeId } = useResumeStore(useShallow((s) => ({ currentResume: s.currentResume, setCurrentResume: s.setCurrentResume, setCurrentResumeId: s.setCurrentResumeId })));
   ```

**Important**: For files that destructure only 1 field (CareerPathSheet, LinkedInOptimizerSheet), use a simple selector `useResumeStore((s) => s.fieldName)` instead of `useShallow`. This is simpler and equally effective for single fields. For 2+ fields, use `useShallow`.

**For each file**: Add the `useShallow` import ONLY if the file uses `useShallow` (2+ fields). Files using direct selectors (1 field) don't need the import.

**DO NOT** change any other code in these files.

---

**Phase 6 Checkpoint**: The app should work identically to before. No visual changes. Use React DevTools Profiler to verify reduced re-renders when typing in the editor.

---

## Phase 7: Manual Verification (Polish)

**Purpose**: Validate all changes meet success criteria. No code changes in this phase.

### T020 [S] Run Lighthouse accessibility audit

**What to do**: Open the app in Chrome, navigate to the Editor page, open DevTools → Lighthouse tab → check "Accessibility" category → run audit. Target score: 90+.

If score is below 90, note the specific failures for follow-up.

---

### T021 [S] Test keyboard navigation

**What to do**: Open the app, navigate to EditorPage, Dashboard, ApplicationsPage. Press Tab repeatedly through all interactive elements. Verify:
- Every button, link, and input shows a visible focus ring (colored outline)
- No element is skipped
- Icon-only buttons are announced by the browser's tooltip or accessibility tree

---

### T022 [S] Test skeleton loaders with slow network

**What to do**: Open Chrome DevTools → Network tab → Throttling → "Slow 3G". Navigate to:
1. `/editor` — should show EditorSkeleton, not blank
2. A job detail page — should show DetailSkeleton, not blank

---

### T023 [S] Test PortfolioEditorPage unsaved changes

**What to do**:
1. Navigate to the portfolio editor
2. Edit the bio field
3. Click the Back button → unsaved changes dialog should appear
4. Click "Cancel" → stay on page
5. Click Back again → click "Discard" → navigate away without saving
6. Go back to portfolio editor, edit bio, click Back → click "Save & Leave" → changes saved, then navigated
7. Try closing/refreshing the browser tab with unsaved changes → browser's native warning should appear

---

### T024 [S] Verify build output

**What to do**: Run `npx vite build` and check the terminal output. Verify:
- `three-XXXX.js` chunk exists
- `html2canvas-XXXX.js` chunk exists
- Main `index-XXXX.js` chunk is smaller than before

---

### T025 [S] Update spec status

**What to do**: In `specs/018-ui-ux-performance-audit/spec.md`, change the status line from:
```
**Status**: Draft
```
to:
```
**Status**: Implemented
```

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Global Styles): No dependencies — start immediately
- **Phase 2** (Loading States): Independent — can run parallel with Phase 1
- **Phase 3** (Aria Labels): T006 (audit) must complete before T007-T009. T007-T009 can run in parallel.
- **Phase 4** (Unsaved Changes): Independent — can run parallel with Phase 1-3
- **Phase 5** (Lazy Loading): Independent — can run parallel with Phase 1-4. T011 before T012. T012 before T013.
- **Phase 6** (Query/Store): Independent — can run parallel with Phase 1-5. All tasks can run in parallel.
- **Phase 7** (Verification): Depends on ALL prior phases completing.

### Parallel Opportunities

```
Parallel group 1: T001, T002, T003 (different files / already done)
Parallel group 2: T004, T005 (different pages)
Parallel group 3: T007, T008, T009 (different directories, after T006)
Parallel group 4: T014, T015, T016, T017, T018, T019 (all different files)
Sequential: T011 → T012 → T013 (build pipeline)
Sequential: T020 → T021 → T022 → T023 → T024 → T025 (verification)
```

---

## Task Count Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Global Styles | 3 (T001-T003) | focus-visible, placeholder contrast, disabled button (already done) |
| Phase 2: Loading States | 2 (T004-T005) | EditorPage + JobDetailPage skeletons |
| Phase 3: Aria Labels | 4 (T006-T009) | Audit + fix icon buttons across 3 directory groups |
| Phase 4: Unsaved Changes | 1 (T010) | PortfolioEditorPage protection |
| Phase 5: Lazy Loading | 3 (T011-T013) | Vite chunks + html2canvas dynamic import + verify |
| Phase 6: Query/Store | 6 (T014-T019) | staleTime + useShallow across editor sheets |
| Phase 7: Verification | 6 (T020-T025) | Lighthouse, keyboard, skeleton, unsaved, build, status |
| **Total** | **25** | |
