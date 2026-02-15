

## Add "More Sections" FloatingPanel to Editor Stepper

### Overview

Add a FloatingPanel-based "More" button at the end of the section stepper navigation. Tapping it opens a mobile-friendly panel with a 2-column grid of additional sections (Awards, Projects, Certifications, Languages, etc.). Selecting a section jumps directly to it -- combining the two-step flow (tap More tab, then pick section) into one action.

### What Changes

**File: `src/components/editor/StepperNav.tsx`**

1. **Add a new prop** `onMoreSectionSelect?: (sectionId: string) => void` to `StepperNavProps`. This callback is invoked when a user picks a specific sub-section from the FloatingPanel, allowing the parent (EditorPage) to set both `activeTab` and `moreSubSection` in one go.

2. **Add imports** for `FloatingPanelRoot`, `FloatingPanelTrigger`, `FloatingPanelContent`, `FloatingPanelBody` from `@/components/ui/floating-panel`, plus section icons (`Trophy`, `Rocket`, `Award`, `BookOpen`, `Heart`, `Globe`, `Palette`, `Users`) from lucide-react.

3. **Define a constant** `MORE_SECTIONS` array (same 8 sections as `AddSectionSheet`):

| id | label | icon | color |
|----|-------|------|-------|
| awards | Awards | Trophy | text-amber-500 |
| projects | Projects | Rocket | text-blue-500 |
| certifications | Certifications | Award | text-orange-500 |
| publications | Publications | BookOpen | text-emerald-500 |
| volunteering | Volunteering | Heart | text-rose-500 |
| languages | Languages | Globe | text-cyan-500 |
| hobbies | Hobbies | Palette | text-purple-500 |
| references | References | Users | text-sky-500 |

4. **Mobile view**: After the bottom sheet for section selection, add a separate row below the dropdown trigger with the FloatingPanel. The trigger is a compact pill button with `Plus` icon and "More" label. The panel content renders a 2-column grid of section buttons (44px min height, `active:scale-95`, `touch-manipulation`). Tapping a section calls `onMoreSectionSelect?.(sectionId)`, then closes the panel.

5. **Desktop view**: At the end of the horizontal stepper (after the last step button), add a similar FloatingPanel trigger -- a smaller `Plus` icon button. The panel content uses the same 2-column grid.

6. **The existing "more" step remains in the steps array.** The FloatingPanel is an *additional* quick-access entry point, not a replacement.

**File: `src/pages/EditorPage.tsx`**

1. **Add a handler** `handleMoreSectionSelect` that sets both `activeTab` to `'more'` and `moreSubSection` to the chosen section ID, then scrolls to top:

```text
const handleMoreSectionSelect = useCallback((sectionId: string) => {
  setActiveTab('more');
  setMoreSubSection(sectionId);
  scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
}, []);
```

2. **Pass it to StepperNav** as the new `onMoreSectionSelect` prop (line ~870-877).

### Logic Preservation

- `handleTabChange` is untouched
- `activeTab` and `moreSubSection` state management is unchanged
- The "More" step in the stepper array remains
- All section rendering in `renderEditorContent` stays identical
- The `AddSectionSheet` grid inside the "More" tab still works as before

### Files to Modify

| File | Change |
|------|--------|
| `src/components/editor/StepperNav.tsx` | Add `onMoreSectionSelect` prop, FloatingPanel trigger and content with section grid |
| `src/pages/EditorPage.tsx` | Add `handleMoreSectionSelect` callback, pass to StepperNav |

