## Fix Four Editor Issues

### Issue 1: Duplicate Progress Indicators -- Simplify to Bar Only

**Problem:** Below the resume title in the editor header, there are two redundant indicators: "Resume 51% Complete" text with a progress bar, AND a "Completeness: 51/100" collapsible badge below it. This is cluttered.

**Fix in `src/pages/EditorPage.tsx` (lines 978-1048):**

- Remove the "Resume X% Complete" text label from the `ProgressBar` component by passing `compact` prop (shows only the bar without text)
- Remove the "Completeness: X/100" collapsible badge section entirely
- Keep only the slim progress bar + save status indicator in a clean single row while keeping it can be expanded so the user can see what is missing but it will be as a simple pop up

### Issue 2: TailorSheet X Button and Settings Button Too Close

**Problem:** In the AI Resume Tailor sheet header, the Settings gear button and the sheet's built-in X (close) button are side by side with only `gap-1` spacing, making them easy to mis-tap on mobile.

**Fix in `src/components/editor/TailorSheet.tsx` (lines 413-433):**

- Increase gap between the Settings button and the sheet close button by adding `mr-6` (or `pr-10`) to the button container so it doesn't collide with the sheet's absolute-positioned close button
- The `SheetContent` component renders an automatic `X` close button at `top-4 right-4`; the Settings/History buttons need to stay clear of that zone

### Issue 3: Gap Explain/Fill Buttons Do Nothing

**Problem:** In `ExperienceTimeline.tsx`, the `useIsMobile()` hook is called on line 93, AFTER a conditional early return on line 88. This violates React's Rules of Hooks (hooks must not be called conditionally), causing the component to potentially crash or behave incorrectly on re-renders. Additionally, the gap detection threshold differs between timeline segments (>= 1 month) and `detectGaps()` (>= 2 months effective), so some displayed gaps have no matching entry in the `gaps` array, making buttons non-functional.

**Fix in `src/components/editor/ExperienceTimeline.tsx`:**

- Move `useIsMobile()` call to the top of the component, BEFORE any conditional returns (above the `useMemo`)
- Align gap detection: use each segment's own gap info to pass to the callbacks instead of always picking the "longest gap" from a separately-computed array

### Issue 4: Template Chooser Hidden on Mobile

**Problem:** On mobile, the "Change Template" option is buried inside the Tools sheet (accessible via the sparkles button). Users may not discover it easily.

**Fix in `src/pages/EditorPage.tsx` (lines 916-924):**

- Add a dedicated "Template" button in the mobile header next to the existing "Tools" button
- This button uses the `LayoutGrid` icon and directly opens the template selector sheet
- Keep the template option in the Tools sheet as well for discoverability

### Files Changed


| File                                           | Change                                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/pages/EditorPage.tsx`                     | Remove duplicate completeness badge; add compact progress bar; add mobile Template button in header |
| `src/components/editor/TailorSheet.tsx`        | Add right padding to header buttons to avoid overlap with sheet close X                             |
| `src/components/editor/ExperienceTimeline.tsx` | Move `useIsMobile()` above conditional return; fix gap button callbacks                             |
