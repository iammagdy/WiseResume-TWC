

## Add Inline Editing to AI-Generated Gap Filler Suggestions

### Overview

Currently, when the user selects one of the 3 AI-generated suggestions in the Gap Filler sheet, they can only accept it as-is. This change adds an inline editing step so users can tweak the title, company, description, and achievements before confirming the addition to their resume.

### User Flow

1. User taps one of the 3 AI suggestion cards (existing behavior)
2. The selected card expands into an editable form showing:
   - **Job Title** (text input, pre-filled)
   - **Company** (text input, pre-filled)
   - **Description** (textarea, pre-filled)
   - **Achievements** (editable list with delete/add controls)
3. User modifies any fields as needed
4. Taps **"Add to Resume"** to insert the edited version

### Technical Changes

**File: `src/components/editor/GapFillerSheet.tsx`**

- Add an `editedSuggestion` state (`Suggestion | null`) that gets populated when a card is selected
- When `selectedIndex` changes, copy that suggestion into `editedSuggestion` for editing
- Replace the static display of the selected card with editable `Input` and `Textarea` fields:
  - Title: `<Input>` with label "Job Title"
  - Company: `<Input>` with label "Company"
  - Description: `<Textarea>` with label "Description"
  - Achievements: Render each as an `<Input>` with a delete (X) button, plus an "Add achievement" button at the bottom
- Non-selected cards remain as read-only clickable options (existing behavior)
- Update `handleAddToResume` to use `editedSuggestion` instead of `suggestions[selectedIndex]`
- Add `handleAchievementChange`, `handleRemoveAchievement`, and `handleAddAchievement` helper functions for the achievements list

### Result

Users get full control to refine AI suggestions (fix company names, adjust titles, reword achievements) before the entry is committed to their resume, making the feature more trustworthy and flexible.

