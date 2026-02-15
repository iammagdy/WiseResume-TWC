

## Add "Select All" Toggle to AI Enhance Sheet

### Change

**File: `src/components/editor/ai/AIEnhanceSheet.tsx`**

Add a "Select All / Deselect All" toggle button in the "Sections to Enhance" header row. This sits next to the existing label and lets users toggle all available sections with one tap instead of selecting them individually.

**Specific edits (lines 219-220):**
- Change the header from a single `<p>` to a flex row with the label on the left and a "Select All" / "Deselect All" text button on the right
- The button checks if all `availableSections` are already selected; if yes, it clears the set; if no, it adds all of them
- Includes `haptics.light()` feedback on tap

### Layout

```text
Sections to Enhance          [Select All]   <-- clickable text button
[x] Summary
[x] Experience
[x] Skills
[x] Education
```

When all are selected, the button text changes to "Deselect All".

### Technical Details

- The toggle logic: `allSelected = availableSections.every(s => selectedSections.has(s.id))`
- Select all: `setSelectedSections(new Set(availableSections.map(s => s.id)))`
- Deselect all: `setSelectedSections(new Set())`
- Styled as a small text button (`text-xs text-primary`) with 44px min touch target

