

# Redesign Editor User Flow and Fix Button Positioning

## Issues Found

### User Flow Problems

1. **Duplicate section titles** -- Each section renders its own `<h3>` title (e.g., "Contact Information", "Work Experience") inside the section component, AND `SectionCard` also renders a title with an icon. The user sees the section name twice stacked on top of each other.

2. **No "Next" navigation between sections** -- Users must manually tap the stepper circles to move between sections. There is no obvious forward/backward button to guide them through the flow sequentially. This makes the editing experience feel disconnected rather than guided.

3. **AI Studio bar is overwhelming for first-time users** -- The bottom area stacks the AI Studio collapsible bar AND a large "Preview & Export" button, taking up significant screen space and creating visual noise. Users editing their first resume are presented with 7+ AI tools before they have even finished filling in basic information.

4. **NextStepBanner appears too early** -- The preview banner shows as soon as Contact + Experience are filled, but Summary, Education, and Skills may still be empty. This can mislead users into thinking they are done.

### Button Positioning Problems

5. **"Add" button placement inconsistency** -- In Experience and Education sections, the "Add" button is in the header row next to the title. But in Skills, there is no "Add" button in the header -- the add functionality is inline with an input field. Contact and Summary have no add button at all (correct, since they are single-entry). This inconsistency is fine functionally but could be cleaner.

6. **Delete buttons are full-width and destructive-red** -- In Experience and Education expanded cards, the delete button is `w-full` with `variant="destructive"` and `size="lg"`. This makes it very prominent and easy to accidentally tap on mobile. A subtler placement (e.g., small icon button in the card header) would be safer.

7. **InlineAIButton position varies** -- In Contact and Summary, the AI button is on the right side of the section header. In Experience and Education, it is on the left side next to the title. This inconsistency creates confusion about where AI actions live.

8. **Experience section has TWO InlineAIButtons** -- One in the section header (line 137-142) and one inside each expanded experience entry (line 293-298). This is redundant and confusing -- users do not know which one to tap.

## Changes

### 1. Remove duplicate section titles from section components

**Files:** `ContactSection.tsx`, `SummarySection.tsx`, `ExperienceSection.tsx`, `EducationSection.tsx`, `SkillsSection.tsx`

Remove the `<h3>` title + `InlineAIButton` header row from each section component. The `SectionCard` wrapper already provides the title, icon, and status. This will eliminate the double-title issue.

Move the `InlineAIButton` into the `SectionCard` header area instead (passed as a prop or rendered alongside the title).

### 2. Add SectionCard AI action slot

**File:** `SectionCard.tsx`

Add an optional `action` prop to `SectionCard` that renders a slot in the header row (right side). This is where the `InlineAIButton` will live for each section, providing consistent placement.

### 3. Add Next/Previous section navigation

**File:** `EditorPage.tsx`

Add "Next" and "Previous" buttons at the bottom of each section's content area. The "Next" button advances to the next stepper step, and "Previous" goes back. On the last step (Skills), the "Next" button becomes "Preview & Export". This provides a clear guided flow.

### 4. Make delete buttons subtler

**Files:** `ExperienceSection.tsx`, `EducationSection.tsx`

Replace the full-width destructive delete button with a small icon button (`Trash2` icon) positioned in the top-right of the expanded card content area. Add a confirmation step (or at minimum make it less prominent with `variant="ghost"` and `text-destructive`).

### 5. Standardize InlineAIButton position

**Files:** `ExperienceSection.tsx`

Remove the duplicate header-level `InlineAIButton` from Experience section. Keep only the per-entry AI button inside expanded cards (since each entry has different content to enhance). For the section-level AI action, use the `SectionCard` action slot.

### 6. Improve NextStepBanner trigger logic

**File:** `EditorPage.tsx`

Change the banner condition from `contact && experience` to showing when ALL 5 sections are complete (or at least 4 out of 5). This prevents premature "you're done" signals.

### 7. Simplify the bottom footer area

**File:** `EditorPage.tsx`

Move the "Preview & Export" button into the section navigation (it becomes the final "Next" action on the Skills tab). Remove the always-visible large button from the bottom. Keep only the AI Studio bar in the bottom fixed area, making it less cluttered.

Alternatively, reduce the Preview button to a smaller, secondary style when sections are incomplete, and make it prominent only when progress is 80%+.

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/editor/SectionCard.tsx` | Add optional `action` prop for AI button slot |
| `src/components/editor/ContactSection.tsx` | Remove duplicate `<h3>` title and header row |
| `src/components/editor/SummarySection.tsx` | Remove duplicate `<h3>` title and header row |
| `src/components/editor/ExperienceSection.tsx` | Remove duplicate title, remove header AI button, make delete button subtler |
| `src/components/editor/EducationSection.tsx` | Remove duplicate title, make delete button subtler |
| `src/components/editor/SkillsSection.tsx` | Remove duplicate `<h3>` title and header row |
| `src/pages/EditorPage.tsx` | Add Next/Previous navigation, update NextStepBanner logic, pass AI actions to SectionCard, simplify footer |

