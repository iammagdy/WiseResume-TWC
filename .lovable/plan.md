

## Fix: AI Health Badge Overlapping Editor Header

### Problem
The AI Health Badge is positioned as `absolute top-2 right-3 z-30` in the `AppShell` layout. On the editor page, the editor has its own sticky header at `z-50` with action buttons in the top-right area. The health badge visually overlaps with the editor's header elements (profile picture/avatar), creating the layering issue visible in the screenshot.

### Solution
Remove `/editor` from the `AI_ROUTES` array. The editor already has its own AI provider indicators (AIEngineBadge, AIProviderBadge) embedded within its sheets and AI action bars, so the floating health badge is redundant on this page and causes overlap.

### Technical Details

**File: `src/components/layout/AppShell.tsx`**

Remove `'/editor'` from the `AI_ROUTES` array (line 14):

```typescript
// Before
const AI_ROUTES = ['/dashboard', '/editor', '/ai-studio', '/interview', '/cover-letter', '/career', '/resignation-letter'];

// After
const AI_ROUTES = ['/dashboard', '/ai-studio', '/interview', '/cover-letter', '/career', '/resignation-letter'];
```

This is the simplest fix: the editor page has dedicated AI provider badges in its sheets and toolbars, so the floating AppShell badge is unnecessary and causes the overlap with the editor header.

