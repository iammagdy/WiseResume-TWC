

# Fix Mobile Editor UI Issues

## Problem Analysis

Based on the screenshots, there are two main UI issues on the mobile editor:

1. **Tab navigation clipping**: The horizontal scrolling tab list clips the first tab "Contact" to show only "tact" because:
   - The `mx-4` margin doesn't provide enough left padding for the scroll container
   - The scroll container starts from the edge, cutting off content

2. **Overlapping bottom elements**: The "Preview & Export" button and "AI Assistant" bar create visual confusion:
   - AI Assistant bar is `fixed` at `bottom-28` (112px from bottom)
   - Preview button is `sticky` at `bottom-16` (64px from bottom)
   - These stack awkwardly and the spacing isn't consistent

## Solution

### 1. Fix Tab Navigation Clipping

**File: `src/pages/EditorPage.tsx`**

Change the TabsList padding structure:
- Remove `mx-4` from TabsList (outer margin causes clip on scroll)
- Add `px-4` inside the scroll container so first/last tabs have proper spacing
- Use `w-full` to ensure full-width container

```text
Before: <TabsList className="mx-4 mt-3 flex overflow-x-auto h-auto p-1 gap-1 scrollbar-hide">
After:  <TabsList className="mt-3 flex overflow-x-auto h-auto p-1 gap-1 scrollbar-hide px-4">
```

### 2. Fix Bottom Element Stacking

**File: `src/pages/EditorPage.tsx`**

Restructure the bottom elements to use proper spacing:
- Change the Preview button from `sticky bottom-16` to a container that sits above the AI bar
- Ensure proper padding and margins so nothing overlaps

**File: `src/components/editor/AIAssistantBar.tsx`**

Adjust positioning to work with the bottom nav:
- Change from `fixed bottom-28` to a relative/sticky position that respects the layout flow
- Or adjust the bottom spacing to account for both the bottom nav (h-16 = 64px) and Preview button area

### 3. Better Layout Architecture

Restructure the EditorPage bottom section:
- Make the content area scroll properly with enough bottom padding
- Stack the AI Assistant bar and Preview button in a consistent order
- Ensure the bottom tab bar (h-16 + safe area) doesn't overlap content

## Technical Details

### EditorPage.tsx Changes

```text
TabsList fix:
- Line 181: Remove mx-4, add px-4 inside container

Bottom layout fix:
- Adjust main content padding to account for:
  - Bottom nav: 64px (h-16)
  - AI Assistant bar: ~56px collapsed
  - Preview button: ~72px
  - Total: ~192px bottom padding needed

- Consider making AI Assistant bar part of the layout flow rather than fixed
```

### AIAssistantBar.tsx Changes

```text
Position adjustment:
- Change bottom-28 to bottom-36 or higher to clear Preview button
- Or refactor to use sticky positioning within the editor container
```

### Files to Modify

1. **`src/pages/EditorPage.tsx`**
   - Fix TabsList padding to prevent first tab clipping
   - Restructure bottom section for proper element stacking
   - Adjust content area padding

2. **`src/components/editor/AIAssistantBar.tsx`**
   - Adjust positioning to prevent overlap with Preview button

## Expected Result

- All tab names fully visible and scrollable on mobile
- Preview & Export button clearly separated from AI Assistant bar
- No overlapping or clipped UI elements
- Proper touch targets maintained

