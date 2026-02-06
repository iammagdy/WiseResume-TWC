

# Smart Tab Scrolling & AI Feature Menu Redesign

## Overview

This plan addresses two improvements to the Editor page:

1. **Smart Tab Auto-Scrolling** - Automatically scroll the tab bar to reveal adjacent tabs when switching, helping users discover all sections (especially Skills)
2. **AI Menu Redesign** - Rename "AI Assistant" to something more fitting and reorganize the menu to focus on AI-powered features

---

## Part 1: Smart Tab Auto-Scrolling

### Current Problem
- The tabs bar scrolls horizontally on mobile
- Users may not notice the "Skills" tab is hidden off-screen
- No visual cue or smart behavior to help users discover all tabs

### Solution

Implement bidirectional smart scrolling:
- When switching **right** (e.g., Contact → Summary), scroll left to reveal next tabs
- When switching **left** (e.g., Education → Work), scroll right to show previous tabs
- Use smooth scroll animation for a polished feel

### Technical Approach

```text
Tabs: [Contact] [Summary] [Work] [Education] [Skills]
         ^                                      ^
     index 0                               index 4

When user clicks Summary (index 1):
→ Scroll to show Work (index 2) on the right

When user clicks Education (index 3):
→ Also ensure Skills (index 4) is visible

When user clicks Work from Education:
→ Scroll right to show Contact/Summary area
```

### Implementation Details

**File: `src/pages/EditorPage.tsx`**

1. Add a `ref` to the scrollable tabs container
2. Add refs to each `TabsTrigger` button
3. Create a tab order array: `['contact', 'summary', 'experience', 'education', 'skills']`
4. On tab change:
   - Determine if user is moving left or right
   - Calculate which tab to scroll into view (the next one in that direction)
   - Use `scrollIntoView({ behavior: 'smooth', inline: 'center' })` or calculate scroll position

**Logic:**
```typescript
const TAB_ORDER = ['contact', 'summary', 'experience', 'education', 'skills'];

const handleTabChange = (newTab: string) => {
  const prevIndex = TAB_ORDER.indexOf(activeTab);
  const newIndex = TAB_ORDER.indexOf(newTab);
  const isMovingRight = newIndex > prevIndex;
  
  // Scroll to show the NEXT tab in direction of movement
  const targetIndex = isMovingRight 
    ? Math.min(newIndex + 1, TAB_ORDER.length - 1)  // Show next tab
    : Math.max(newIndex - 1, 0);                     // Show previous tab
  
  // Scroll that tab into view
  tabRefs[targetIndex]?.scrollIntoView({ 
    behavior: 'smooth', 
    inline: 'center' 
  });
  
  setActiveTab(newTab);
};
```

---

## Part 2: AI Feature Menu Redesign

### Current Problem
- "AI Assistant" name is generic and doesn't convey the specific AI capabilities
- "Change Template" is not an AI feature - it's just template selection
- The menu doesn't feel distinctly "AI-powered"

### Analysis of Current Features

| Feature | AI-Powered? | Purpose |
|---------|-------------|---------|
| Tailor for Job | Yes | Uses AI to match resume to job description |
| Analyze Match | Yes | AI scores resume against job requirements |
| Improve Section | Yes | AI enhances resume sections |
| Change Template | No | Simple UI template picker |

### Proposed Redesign

**New Name Options:**
- **"AI Studio"** - Conveys a creative workspace powered by AI
- **"Smart Tools"** - Emphasizes intelligence without being too technical
- **"AI Power"** - Direct and impactful
- **"Resume AI"** - Clear connection to the app's purpose

**Recommended: "AI Studio"** - It sounds premium, creative, and clearly AI-focused.

**Reorganization:**
1. Remove "Change Template" from the AI menu
2. Add a separate template icon in the header or toolbar
3. Keep only true AI features:
   - **Tailor for Job** → Rename to **"Smart Tailor"**
   - **Analyze Match** → Keep or rename to **"Job Match"**
   - **Improve Section** → Rename to **"AI Enhance"**

### Visual Changes

**Before:**
```text
+----------------------------------+
| [✨] AI Assistant    [Score] [▲] |
+----------------------------------+
| ┌─────────┐  ┌─────────┐        |
| │ Tailor  │  │ Analyze │        |
| │ for Job │  │ Match   │        |
| └─────────┘  └─────────┘        |
| ┌─────────┐  ┌─────────┐        |
| │ Improve │  │ Change  │  ← NOT AI
| │ Section │  │Template │        |
| └─────────┘  └─────────┘        |
+----------------------------------+
```

**After:**
```text
+----------------------------------+
| [✨] AI Studio       [Score] [▲] |
+----------------------------------+
| ┌─────────┐  ┌─────────┐        |
| │  Smart  │  │   Job   │        |
| │ Tailor  │  │  Match  │        |
| └─────────┘  └─────────┘        |
| ┌─────────────────────┐         |
| │    AI Enhance       │         |
| │  Current: Summary   │         |
| └─────────────────────┘         |
+----------------------------------+
```

### Implementation Details

**File: `src/components/editor/AIAssistantBar.tsx`**

1. Rename component to `AIStudioBar` (optional, can keep file name)
2. Change title from "AI Assistant" to "AI Studio"
3. Remove the "Change Template" action button
4. Rename action labels:
   - "Tailor for Job" → "Smart Tailor"
   - "Analyze Match" → "Job Match" 
   - "Improve Section" → "AI Enhance"
5. Make "AI Enhance" span full width (since we removed one item)

**File: `src/pages/EditorPage.tsx`**

1. Move template selection to the header or a separate toolbar button
2. Remove `onChangeTemplate` prop from AIStudioBar
3. Add a template button in the header area (next to save status)

**File: `src/components/editor/AIHubSheet.tsx`** (if still used)

Apply same naming changes for consistency.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/EditorPage.tsx` | Add tab refs, implement smart scroll logic, relocate template button |
| `src/components/editor/AIAssistantBar.tsx` | Rename to "AI Studio", update action labels, remove template option, adjust grid layout |
| `src/components/editor/AIHubSheet.tsx` | Apply same naming changes for consistency |

---

## Summary of Changes

### Smart Tab Scrolling
- Tabs automatically scroll to reveal adjacent sections when switching
- Moving right reveals tabs on the right (so users see Skills)
- Moving left reveals tabs on the left
- Smooth scroll animation for polished UX

### AI Studio Redesign
- "AI Assistant" → **"AI Studio"** (premium, creative feel)
- Remove "Change Template" (not AI-related)
- Cleaner 3-action layout focused purely on AI features
- Action labels updated to feel more intelligent and cohesive
- Template selection moved to a dedicated button elsewhere

