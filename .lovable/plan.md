

# Side-by-Side Resume Comparison Feature

## Overview
Add a comparison view that allows users to see their original resume content alongside the AI-tailored version before applying changes. This helps users understand exactly what changed and make informed decisions about accepting modifications.

---

## Design Approach

Since this is a mobile-first Android app, the comparison view needs to be optimized for smaller screens. Rather than a true side-by-side layout (which would be too cramped), we'll implement:

1. **Swipeable tabs** - Toggle between "Original" and "Tailored" views
2. **Inline diff highlighting** - Visual indicators showing what changed
3. **Section-by-section comparison** - Expandable cards for each resume section (Summary, Skills, Experience)

---

## User Flow

1. User clicks "Tailor" button on EditorPage
2. Pastes job description and clicks "Tailor My Resume"
3. After AI processes, a new "Compare Changes" button appears
4. Tapping it opens a full-screen comparison sheet
5. User can swipe between Original/Tailored tabs or expand individual sections to see differences
6. Added text highlighted in green, removed text shown with strikethrough
7. User can apply all changes or return to review more

---

## Implementation Details

### New Component: CompareSheet.tsx

A full-screen sheet component with:
- Header with "Compare Changes" title and close button
- Tab navigation: "Original" | "Tailored" | "Diff"
- Scrollable content area with collapsible sections:
  - Summary comparison
  - Skills comparison (showing added/removed skills)
  - Experience bullets comparison (per job)
  - Education details comparison
- Footer with "Apply Changes" and "Cancel" buttons

### Updates to TailorSheet.tsx

- Add "Compare Changes" button after successful tailoring
- Store original resume snapshot before tailoring starts (already implemented)
- Pass both original and tailored data to CompareSheet

### Diff Visualization Logic

Create utility functions in a new file:
- `highlightAdditions(original, tailored)` - Returns JSX with green highlights for new content
- `highlightRemovals(original, tailored)` - Shows removed content with strikethrough
- `compareSkillArrays(original, tailored)` - Identifies added/removed skills

---

## Technical Details

### Files to Create

1. **src/components/editor/CompareSheet.tsx**
   - Main comparison sheet component
   - Uses Tabs for Original/Tailored/Diff views
   - Uses Accordion for collapsible sections
   - Framer Motion for smooth animations

2. **src/lib/diffUtils.ts**
   - Text diff algorithm for summary comparison
   - Array diff for skills comparison
   - Helper functions for formatting differences

### Files to Modify

1. **src/components/editor/TailorSheet.tsx**
   - Add state for showing comparison sheet
   - Add "Compare Changes" button after tailoring completes
   - Pass original resume and tailor result to CompareSheet

---

## Visual Design

### Color Scheme (following existing design system)
- **Added content**: `bg-success/20` with `text-success` (green)
- **Removed content**: `bg-destructive/20` with `line-through` (red)
- **Unchanged content**: Normal text styling

### Layout
- Full-height bottom sheet (like existing TailorSheet)
- Pill-style tab switcher at top
- Cards with rounded corners for each section
- Badges showing change counts (+3 skills, -1 skill)

### Mobile Optimizations
- Touch-friendly swipe between tabs
- Collapsible sections to reduce scrolling
- Sticky action buttons at bottom
- Safe area padding for Android navigation

