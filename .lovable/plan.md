
## Fix Dashboard Resume Card UI Issues

### Problems Identified

1. **Red line below score** -- The ATS Score breakdown has a progress bar (h-2 red bar) that renders **outside** the collapsible content, so it always shows as a harsh red stripe even when the breakdown is collapsed. This is the most visible issue in the screenshot.
2. **Left border adds more red** -- The card has a `border-l-4 border-l-destructive` that creates another red accent when scores are low, making the card feel overly alarming.
3. **Too much visual density** -- The card stacks: Score Ring, Title + badges, Target Job, Completion bar, Edited time, AND ATS score bar + breakdown -- all in a tight space. On mobile this creates clutter.
4. **Completion bar and ATS bar confusion** -- Two separate colored bars (completion at 12% and ATS at 10/100) appear close together and look similar, creating confusion about what each represents.

---

### Fixes

#### 1. Move ATS Score Bar Inside the Collapsible (ATSScoreBreakdown.tsx)

Move the always-visible `h-2` progress bar (lines 96-101) inside the `CollapsibleContent` so it only shows when the user expands the ATS breakdown. This eliminates the floating red line.

#### 2. Soften the Left Border (ResumeListCard.tsx)

Change the `border-l-4` from hard status colors to a subtle `border-l-primary/30` so it provides structure without screaming red on low-score resumes.

#### 3. Add Labels to Distinguish Bars

Add a tiny "Completeness" label next to the completion progress percentage and ensure the ATS bar only appears inside its collapsible section, so there's no confusion between the two metrics.

#### 4. Tighten Spacing

Reduce some margins (`mb-2` to `mb-1`) on the target job and completion sections to decrease card height without losing readability.

---

### Technical Details

**File: `src/components/dashboard/ATSScoreBreakdown.tsx`**
- Move lines 96-101 (the score bar div) inside the `CollapsibleContent` block, right before the category breakdowns
- This means the red bar only shows when the user taps to expand

**File: `src/components/dashboard/ResumeListCard.tsx`**
- Line 150-154: Change the border-l color logic to always use `border-l-primary/20` for a subtle, non-alarming accent
- Line 290: Reduce `mb-2` to `mb-1` on the completion progress wrapper
- Line 281: Reduce `mb-2` to `mb-1` on the target job button

---

### Summary

| Issue | Fix |
|-------|-----|
| Red line below score | Move ATS bar inside collapsible -- hidden by default |
| Aggressive red left border | Use subtle `border-l-primary/20` for all cards |
| Bar confusion | ATS bar only visible on expand; completion bar always visible |
| Card too tall | Tighten vertical spacing |
