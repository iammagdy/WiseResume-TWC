
# Comprehensive UI/UX Audit -- All Tabs and Screens

After reviewing every page and component in the app, here are the issues found organized by screen, with severity ratings and fixes.

---

## Tab 1: Home (Dashboard)

### Issues Found

1. **Header icon overload on small screens (375px)**
   - The header packs 5 interactive elements (HelpCircle, AICredits, AIHealth, Settings, Avatar) in a row. On iPhone SE, these compress and some may overlap or have insufficient spacing.
   - **Fix**: Collapse AICredits and AIHealth into the profile popover menu, leaving only HelpCircle, Settings, and Avatar in the header.

2. **Dashboard has no bottom padding awareness for FAB**
   - The `FloatingCreateButton` renders at `bottom-[7rem]` via portal, but the `PullToRefresh` scrollable area uses `pb-safe` which may not account for the FAB. The last resume card could be obscured.
   - **Fix**: Add `pb-32` to the scrollable content wrapper to ensure the last item clears the FAB.

3. **Embla carousel swipe conflict with PullToRefresh**
   - The Embla carousel for swipeable tabs (My CVs / Tailored) sits inside `PullToRefresh`. Horizontal swipes can inadvertently trigger pull-to-refresh on some Android devices.
   - **Fix**: Add `touch-action: pan-x` on the Embla container to prevent vertical gesture hijacking.

4. **Search input `h-12` is too tall on compact mobile**
   - At 375px width, a 48px input + filter row + selection toolbar consume excessive vertical real estate before any resume cards appear.
   - **Fix**: Use `h-10` (40px) for the search input on mobile, matching the native compaction standard.

---

## Tab 2: Editor

### Issues Found

5. **No loading skeleton when `currentResume` is null but not redirecting**
   - There's an 8-second safety timeout before redirecting. During this wait, the user sees nothing (the component returns early before rendering). This violates the "never show a blank screen" rule.
   - **Fix**: Show `EditorSkeleton` during the loading/validation period instead of returning early with nothing rendered.

6. **Floating action pill position conflicts on landscape orientation**
   - The editor's floating pill (PDF/Preview/ATS) at `bottom-[7rem]` was designed for portrait. In landscape mode on phones, it may overlap with the StepperNav pill bar.
   - **Fix**: Adjust to `bottom-20` in landscape using a media query or orientation check.

7. **`useResumeStore.getState()` called inside render callbacks**
   - Line 440 in `ApplicationsPage` and line 34 in `TemplatesPage` call `useResumeStore.getState()` inside event handlers that set state. While not a UI bug, this creates coupling issues and can produce stale reads.
   - **Fix**: Use the hook-level selector instead for reactive values.

---

## Tab 3: AI Studio

### Issues Found

8. **Excessive bottom padding `pb-[180px]` on mobile**
   - Line 291: `pb-[180px] sm:pb-20`. The 180px padding is far too generous -- it wastes nearly half the viewport on short devices like iPhone SE. This makes the page feel empty at the bottom.
   - **Fix**: Reduce to `pb-28` (112px) which clears the bottom tab bar + safe area without wasting space.

9. **"Select a resume" flow is confusing**
   - When no resume is selected, tapping any tool shows a toast "Create a resume first" with an action link. But the resume picker sheet only shows 5 resumes (`data.slice(0, 5)`). Users with many resumes can't find the one they need.
   - **Fix**: Remove the `slice(0, 5)` limit or add a "View all" link that navigates to dashboard.

10. **Chat suggestion pills overflow on 320px screens**
    - The grid `grid-cols-2` with `px-3 py-1.5` suggestion buttons can cause text overflow on very narrow screens.
    - **Fix**: Use `grid-cols-1 xs:grid-cols-2` to stack on the smallest screens.

---

## Tab 4: Activity (Applications)

### Issues Found

11. **Two different FAB positions for the two sub-tabs**
    - Applications FAB: `bottom-[7.5rem] sm:bottom-20`
    - Jobs FAB: Same position
    - But the `pr-safe` (padding-right safe area) is inconsistent -- it's only on the Jobs FAB but not the Applications FAB in some code paths. This creates asymmetric positioning on phones with notches.
    - **Fix**: Standardize both FABs to use identical positioning classes.

12. **Application card action buttons are too small visually**
    - The "Prep" and "Follow-up" buttons use `text-[11px]` and `min-h-[44px]`, which meets touch targets but looks disproportionate -- a tiny label inside a tall tap zone with no visual feedback of the full area.
    - **Fix**: Increase text to `text-xs` (12px) and add a visible background fill to the full 44px hit area.

13. **No empty state for Activity Timeline**
    - The `ActivityTimeline` component is always rendered but shows nothing when there are no activities. This creates a blank gap between "Recent Activity" heading and the application cards.
    - **Fix**: Add an inline empty state like "No recent activity -- start by adding an application."

14. **Saved Jobs tab: seed button has no guard for unauthenticated users**
    - The `sampleJobs` seeder uses `createJob.mutateAsync()` which requires authentication. If somehow accessed without auth, it will fail silently.
    - **Fix**: Disable the seed button or hide it when `!user`.

---

## Tab 5: Portfolio

### Issues Found

15. **Portfolio Editor page has `overflow-hidden` on root but no internal scroll container**
    - Line 381: `overflow-hidden` on root div. The content scroll is handled by child sections, but the sticky "Save" button at the bottom may not be visible if content is long.
    - **Fix**: Add explicit `overflow-y-auto` on the content area below the header.

16. **Username validation runs on every keystroke with a 500ms debounce, but shows "Checking..." immediately**
    - This creates a flickering UX where the user types and sees "Checking... Checking... Checking..." for each character.
    - **Fix**: Only show "Checking..." after the debounce timer fires (when the actual API call starts), not on every keystroke.

---

## Interview Page

### Issues Found

17. **Empty state button says "Go to Dashboard" but navigates to `/ai-studio`**
    - Line 222: The empty state (no resume selected) shows a "Go to Dashboard" button but `onClick={() => navigate('/ai-studio')}`. This is misleading -- the label and destination don't match.
    - **Fix**: Change label to "Go to AI Studio" or change navigation to `/dashboard`.

18. **BackButton during active interview has no confirmation**
    - During an active interview (phase === 'active'), tapping the back button navigates away immediately, losing the entire session without saving.
    - **Fix**: Add `onBeforeBack` guard that shows the existing `showEndConfirm` dialog before navigating away.

---

## Preview Page

### Issues Found

19. **Template switcher horizontal scroll has no visual indicator**
    - The template list is a horizontal scroll row but has no scroll indicators or fade edges, so users don't know they can scroll to see more templates.
    - **Fix**: Add gradient fade masks on the left/right edges of the template scroll area.

20. **Guest preview hint toast fires after 3 seconds unconditionally**
    - Even if the user is actively interacting (e.g., switching templates), a toast appears prompting sign-up. This feels intrusive.
    - **Fix**: Delay to 10 seconds and check if user has interacted with the page before showing.

---

## Settings Page

### Issues Found

21. **Double `pt-safe` in the header**
    - Line 403: `className="pt-safe sticky top-0 z-10 pt-4 pb-1 px-4 glass-header"` -- both `pt-safe` and `pt-4` are applied. On devices with no safe area, only `pt-4` applies, but on devices with safe areas, both stack, creating excessive top spacing.
    - **Fix**: Remove `pt-4` and rely on `pt-safe` alone, or use `pt-safe` as the container and inner padding separately.

22. **Section index chips have no minimum touch target height**
    - The section navigation chips (`px-3 py-1.5`) result in approximately 30px height, below the 44px minimum.
    - **Fix**: Add `min-h-[44px]` to each chip button.

---

## Cover Letters / Resignation Letters

### Issues Found

23. **FAB overlaps with bottom tab bar**
    - Both pages position the FAB at `fixed bottom-20 right-4`. With the `rounded-3xl` bottom tab bar, this means the FAB sits right at the top edge of the tab bar, which can cause overlap on smaller screens.
    - **Fix**: Standardize to `bottom-[7rem]` matching the staggered hierarchy from project guidelines.

24. **Resignation letter delete button (`x`) has no minimum touch target**
    - Line 143-146: The delete button is just `p-1` with a text `x` character, far below the 44px minimum touch target.
    - **Fix**: Use a proper icon button with `min-w-[44px] min-h-[44px]` and a `Trash2` or `X` Lucide icon.

---

## Notifications Page

### Issues Found

25. **Filter tab pills below 44px touch target**
    - Line 78-85: `px-3 py-1.5 rounded-full text-xs` results in approximately 28px height, well below the 44px minimum.
    - **Fix**: Add `min-h-[44px] flex items-center` to ensure proper touch targets.

26. **"Clear" button is destructive without confirmation**
    - The "Clear all notifications" button immediately deletes all notifications with no confirmation dialog. One accidental tap erases everything.
    - **Fix**: Add an `AlertDialog` confirmation before clearing all.

---

## Onboarding Page

### Issues Found

27. **Template thumbnails in step 2 have no loading state**
    - The `TemplateThumbnail` components are rendered without Suspense or skeleton fallbacks. On slow connections, the grid shows blank boxes.
    - **Fix**: Wrap in `Suspense` with skeleton placeholders matching the thumbnail dimensions.

28. **No haptic feedback on goal selection or template selection**
    - Every other interactive element in the app uses haptics, but onboarding selections are silent.
    - **Fix**: Add `haptics.selection()` on goal and template button clicks.

---

## Upload Page

### Issues Found

29. **No clear "cancel" action during processing**
    - Once a file starts processing (especially OCR which can take 30+ seconds), there's no way for the user to cancel and try a different file.
    - **Fix**: Add a "Cancel" button that sets `isProcessing = false` and resets state.

---

## Cross-Cutting User Flow Issues

30. **No global "resume context" indicator**
    - Users frequently land on AI Studio or Interview without knowing which resume is active. Only AI Studio shows this context bar. The Editor, Preview, and Interview pages assume the user knows.
    - **Fix**: Add a compact resume name chip in the headers of Interview and Preview pages.

31. **Inconsistent back navigation after completing flows**
    - After completing a cover letter creation, the user is on `/cover-letter/edit/:id` but BackButton goes to `/cover-letters`, which goes to `/ai-studio`. This 3-level deep navigation is confusing.
    - **Fix**: After save, show a "Done" button that goes directly to `/cover-letters` instead of relying on sequential back presses.

---

## Priority Summary

| Priority | Count | Examples |
|----------|-------|---------|
| Critical (blocks usage) | 2 | #5 blank editor screen, #18 interview data loss |
| High (poor UX) | 8 | #1 header overflow, #8 wasted space, #17 wrong label, #24 tiny delete target |
| Medium (polish) | 12 | #3 swipe conflict, #9 resume limit, #13 empty timeline, #22 chip targets |
| Low (nice to have) | 9 | #4 input height, #20 toast timing, #28 haptics |

## Recommended Fix Order

1. Fix #5 (blank editor screen) and #18 (interview back without save) -- these lose user data
2. Fix all touch target violations (#22, #24, #25) -- accessibility requirement
3. Fix #8 (AI Studio padding) and #1 (header overflow) -- most visible UX issues
4. Fix #17 (wrong button label) and #26 (destructive clear without confirm) -- user confusion
5. Address remaining medium/low items in batches
