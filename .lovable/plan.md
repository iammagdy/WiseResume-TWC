

## Live Preview Split Screen and ATS Score Breakdown

### Overview

This plan adds two major features: (1) a persistent split-screen live preview for desktop editors, and (2) an actionable ATS score breakdown on dashboard resume cards and in the editor.

---

### Part 1: Live Preview Split Screen (Desktop Only)

**Current state**: Preview opens as a side panel (50% width) or mobile drawer via a toggle button. It already renders the resume template live using Zustand state and supports zoom, section toggles, and PDF download.

**What changes**:

The existing side-panel preview at lines 693-700 of `EditorPage.tsx` already provides a live split-screen -- the resume re-renders from Zustand store changes in real-time. The enhancement adds:

**File: `src/pages/EditorPage.tsx`**

1. **Persistent toggle with localStorage memory**
   - Add a `useLivePreview` state initialized from `localStorage.getItem('wr-live-preview') === 'true'`
   - On desktop (`!isMobile`), auto-set `showPreview` to match `useLivePreview` on mount
   - Update the existing Preview button to also persist preference to localStorage
   - Hidden on mobile (current behavior preserved)

2. **Resizable split layout**
   - Replace the fixed `max-w-[50%]` side panel with `ResizablePanelGroup` from `react-resizable-panels` (already installed)
   - Editor panel: `defaultSize={55}`, `minSize={35}` (ensures ~500px min on 1440px screens)
   - Preview panel: `defaultSize={45}`, `minSize={25}` (ensures ~350px min)
   - `ResizableHandle` with `withHandle` prop for a visible drag grip
   - Only rendered when `showPreview && !isMobile`; otherwise editor takes full width

3. **Debounced preview updates (300ms)**
   - The preview already reads from Zustand store directly (line 101 of LivePreviewPanel), so updates are instant
   - Add a `useDeferredValue` wrapper around the resume data in `LivePreviewPanel` to batch rapid keystrokes
   - This prevents janky re-renders during fast typing while keeping the preview responsive

4. **Synchronized section highlighting**
   - Pass the current `activeTab` from EditorPage to `LivePreviewPanel` as an optional `highlightSection` prop
   - In the preview, wrap the resume container with a CSS class that adds a subtle `outline` or `box-shadow` around the matching section using `data-section` attributes on template sections
   - 300ms fade transition via CSS

**File: `src/components/editor/LivePreviewPanel.tsx`**

5. **Accept `highlightSection` prop**
   - Inject a `<style>` tag that highlights `[data-section="experience"]` (etc.) when `highlightSection` matches
   - 20% opacity accent color border, 300ms transition

**Mobile behavior**: Completely unchanged. The toggle is hidden, and the drawer-based `LivePreviewSheet` continues to work as-is.

---

### Part 2: ATS Score Breakdown

**Current state**: `useResumeScore` calls a backend edge function that returns `overallScore`, 4 category scores (`completeness`, `atsReadiness`, `impactLanguage`, `formatting`), `topStrength`, and `topImprovement`. The `ResumeListCard` shows a `ScoreRing` and the `topImprovement` text. `DashboardStats` shows "Best: X%" badge.

**What changes**:

**File: `src/components/dashboard/ResumeListCard.tsx`**

1. **Expandable ATS breakdown section**
   - Below the existing `ProgressBar`, add a collapsible ATS breakdown card
   - Header row: "ATS Score: 78/100" with colored label ("Good", "Fair", etc.) -- tappable to expand/collapse
   - Default: collapsed on mobile, showing just the header row; expanded on first render for desktop
   - State: `const [showBreakdown, setShowBreakdown] = useState(false)`

2. **Section-by-section scores** (when expanded)
   - Map the 4 categories from `ResumeHealthScore` to visual rows:
     - Completeness, ATS Readiness, Impact Language, Formatting
   - Each row: status icon (CheckCircle/AlertTriangle/XCircle), category name, percentage, colored bar
   - Color thresholds: green (90+), yellow (70-89), orange (50-69), red (0-49)
   - Show `topImprovement` as an actionable hint below

3. **"Improve Score" button**
   - Full-width secondary button at the bottom of the expanded breakdown
   - Action: navigates to `/editor` with `?openTailor=1` to open the AI Tailor sheet, or navigates to `/ai-studio`
   - Min height 48px, `active:scale-95` haptic feedback

4. **Score label helper**
   - New utility function: `getScoreLabel(score)` returns "Excellent" (90+), "Good" (70-89), "Fair" (50-69), "Needs Work" (0-49)
   - `getScoreColor(score)` returns the appropriate Tailwind color class

**File: `src/components/dashboard/DashboardStats.tsx`**

5. **Simplify stats**
   - Remove the "Best: X%" badge (redundant once each card has its own breakdown)
   - Keep total resumes count badge
   - Keep greeting and streak

**File: `src/components/dashboard/ATSScoreBreakdown.tsx`** (new file)

6. **Reusable ATS breakdown component**
   - Props: `healthScore: ResumeHealthScore`, `isScoring: boolean`, `onImprove: () => void`, `compact?: boolean`
   - Renders the expandable breakdown UI
   - Used by both `ResumeListCard` (compact) and can be reused in the editor

**File: `src/pages/EditorPage.tsx`**

7. **Compact ATS indicator in editor header area**
   - Below the progress bar section (line 521), add a small clickable ATS badge: "ATS: 78/100" with colored dot
   - Uses the local `calcOverallScore` for instant updates (no API call needed during editing)
   - Clicking it opens a popover/collapsible showing the section-by-section breakdown from `resumeCompletionRules.ts`
   - For the editor, use the LOCAL scoring functions (Contact, Summary, Experience, Education, Skills) since they're synchronous and free -- no need to call the edge function on every keystroke
   - The 5 section scores map directly to the breakdown rows

8. **Real-time score animation**
   - When the local score increases by 5+ points, show a brief toast: "Score improved to X%!"
   - Track previous score in a ref to detect meaningful changes
   - 1-second debounce after last edit

---

### What Does NOT Change

- All PDF generation, export, and download functionality
- Mobile preview behavior (drawer-based)
- Edge function scoring API and caching
- Template rendering logic
- Data saving, auto-save, and offline sync
- Bottom tab bar navigation
- All editor form sections
- All AI features (chat, tailor, enhance)
- Existing Preview button behavior (still toggles the panel)

---

### Files Summary

| File | Action |
|------|--------|
| `src/pages/EditorPage.tsx` | Add resizable split layout, localStorage preference, ATS badge in header |
| `src/components/editor/LivePreviewPanel.tsx` | Add `highlightSection` prop, `useDeferredValue` |
| `src/components/dashboard/ATSScoreBreakdown.tsx` | New reusable ATS breakdown component |
| `src/components/dashboard/ResumeListCard.tsx` | Integrate ATSScoreBreakdown, add expand/collapse |
| `src/components/dashboard/DashboardStats.tsx` | Remove redundant "Best" badge |

### Implementation Order

1. `ATSScoreBreakdown.tsx` (new component, no dependencies)
2. `ResumeListCard.tsx` (integrate breakdown)
3. `DashboardStats.tsx` (simplify)
4. `LivePreviewPanel.tsx` (add highlight + deferred value)
5. `EditorPage.tsx` (resizable layout + ATS badge)

