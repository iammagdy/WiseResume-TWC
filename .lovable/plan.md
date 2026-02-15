

## Mobile UX Audit: Duplicate Actions and AI Feature Cleanup

### Audit Findings

After tracing every interactive element on the Editor at 360px width, the current state is already well-organized with minimal duplication. Here is the complete inventory:

#### AI and Tool Entry Points on Mobile

| Action | Entry Point(s) | Duplicate? |
|--------|---------------|------------|
| **Wise AI Chat** | Mobile Tools Sheet only | No |
| **Tailor to Job** | Mobile Tools Sheet only | No |
| **ATS Check** | Mobile Tools Sheet only | No |
| **Proofread** | Mobile Tools Sheet + Proofread FAB (floating button, bottom-right) | **Yes -- dual entry** |
| **Design/Customize** | Mobile Tools Sheet only | No |
| **Live Preview** | Mobile Tools Sheet only | No |
| **Versions** | Mobile Tools Sheet only | No |
| **Per-section AI Assist** | Inline button per SectionCard header | No (contextual, correct) |

#### Non-AI Duplicates

| Function | Entry Point(s) | Duplicate? |
|----------|---------------|------------|
| **Preview & Export** | Bottom "Next" button chain (last step becomes "Preview & Export") | No |
| **Add More Sections** | StepperNav "More Sections" button + "More" tab in stepper dropdown | **Intentional dual -- different flows** |

### Issue: Proofread Dual Entry

The **Proofread** action appears in two places simultaneously on mobile:
1. Inside the **Tools Sheet** as "Proofread" row (requires opening sheet first)
2. As the **Proofread FAB** (floating action button) at `bottom-40 right-4`, always visible when issues exist

**Assessment**: This is actually **intentional and useful** -- the FAB acts as a persistent notification badge showing issue count, while the Tools Sheet provides the organized list. The FAB disappears when there are 0 issues. No change needed here.

### True Issues Found

After careful review, the Editor on 360px mobile is **already clean** with no confusing duplicates. However, there are two UX improvements worth making:

#### 1. Proofread FAB overlaps with content on very small screens
On 360px width, the Proofread FAB at `bottom-40 right-4` can overlap the Previous/Next navigation buttons when the user scrolls to the bottom of a section. The FAB should use a slightly higher z-index and a safe position.

#### 2. "More Sections" button always visible even when user is already inside a More sub-section
When the user is editing Projects (a "More" sub-section), the "More Sections" button still appears below the stepper dropdown. This is slightly redundant since the user already has the "All Sections" back button. On mobile, the "More Sections" button should hide when `activeMoreSection` is set.

### Proposed Changes

**File: `src/components/editor/StepperNav.tsx`**

1. **Hide "More Sections" button when already inside a sub-section**: When `activeMoreSection` is set (user is editing Projects, Awards, etc.), hide the "More Sections" button on mobile since the "All Sections" back link already provides navigation. This reduces visual clutter.

**File: `src/components/editor/ProofreadButton.tsx`**

2. **Adjust FAB position for better mobile clearance**: Change `bottom-40` to `bottom-24` on mobile so it sits above the Previous/Next buttons without overlapping. Add `sm:bottom-36` for larger screens.

### What Stays the Same

- All handlers, navigation logic, data models unchanged
- All component names and props unchanged
- Tools Sheet content and organization unchanged
- Per-section AI Assist buttons unchanged (they are correctly contextual)
- Desktop layout unchanged
- AI Studio page unchanged (separate tab, no overlap with Editor)

### Standardized Rule Set (for comments/future work)

```
/*
 * Mobile Editor UX Rules:
 * 1. Global actions (Design, Preview, Wise AI, Tailor, ATS, Proofread, Versions)
 *    live exclusively in the mobile Tools Sheet (sparkles button, top-right).
 * 2. Contextual AI (Improve, Generate, ATS Optimize per section)
 *    lives in the per-section InlineAIButton inside each SectionCard header.
 * 3. The Proofread FAB is the ONLY exception: it may float as a notification
 *    badge when issues > 0, since it serves as an alert, not a primary action.
 * 4. Never place the same AI action in both the Tools Sheet AND the header bar
 *    on the same screen at < 768px.
 * 5. "More Sections" picker should hide when user is already editing a sub-section.
 */
```

### Technical Summary

| File | Change |
|------|--------|
| `src/components/editor/StepperNav.tsx` | Hide "More Sections" button when `activeMoreSection` is set on mobile |
| `src/components/editor/ProofreadButton.tsx` | Adjust FAB bottom position from `bottom-40` to `bottom-24` to avoid overlapping nav buttons |

2 targeted layout tweaks. Zero logic changes. No duplicates introduced or removed (none existed). Adds clarity by hiding redundant navigation when context already provides it.

