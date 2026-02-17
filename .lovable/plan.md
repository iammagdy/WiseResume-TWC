

## Fix: AI Health Badge Overlapping Profile Photo on Dashboard

### Problem
The AI Health Badge is absolutely positioned at `top-2 right-3` in `AppShell.tsx`, while the Dashboard page has its own header with the profile avatar button at the top-right. Both elements occupy the same corner, causing the badge to sit directly on top of the profile photo.

### Solution
Remove `/dashboard` from the `AI_ROUTES` list in `AppShell.tsx`. The dashboard already has its own header with contextual controls (profile avatar, notifications). The AI health status is not critical information on the dashboard -- it is more relevant on pages where users actively use AI features (editor, AI studio, interview, etc.).

This is the simplest and cleanest fix: the dashboard does not need a global AI status indicator competing with its own header controls.

### Technical Details

**File: `src/components/layout/AppShell.tsx` (line 12)**

Remove `'/dashboard'` from the `AI_ROUTES` array:

```
// Before
const AI_ROUTES = ['/editor', '/ai-studio', '/interview', '/cover-letter', '/career', '/dashboard', '/resignation-letter'];

// After
const AI_ROUTES = ['/editor', '/ai-studio', '/interview', '/cover-letter', '/career', '/resignation-letter'];
```

This is a single-line change with no side effects. The badge will continue to appear on all other AI-heavy pages where there is no header conflict.
