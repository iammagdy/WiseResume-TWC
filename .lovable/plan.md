
## Remove Bottom Navigation from Landing Page

### Overview
The landing page currently displays a visual-only "App Preview" bottom tab bar (lines 226-241) that shows the app's navigation UI. This should be removed since the landing page is marketing-focused, and the bottom navigation should only appear in the authenticated app (via AppShell).

### Changes Required

**File: `src/pages/Index.tsx`**

1. **Remove the visual-only bottom tab bar**
   - Delete lines 226-241: The `<div className="fixed bottom-0 left-0 right-0 z-40 glass-surface..."` section
   - Remove the `bottomTabs` constant (lines 27-32) since it's no longer used

2. **Update main container padding**
   - Change line 60: `className="min-h-screen pb-24"` → `className="min-h-screen pb-12"`
   - This replaces the 96px padding (from `pb-24` which accounted for the bottom bar) with 48px (`pb-12`) to provide breathing room at the bottom

3. **Remove unused imports**
   - Remove `Briefcase` from the lucide-react imports (line 2) since it's only used in `bottomTabs`
   - Note: `FileText`, `Settings`, and `Home` are still used in other icon references if needed, so keep them; verify if any are truly unused

### Why These Changes
- **Cleaner landing page**: Removes confusing UI elements that suggest the landing page is part of the app
- **Clear separation**: Landing page is purely marketing; the bottom nav only appears once users enter the app via AppShell
- **Better UX**: Users don't see fake/inactive UI elements; they only see real navigation when they reach the actual app

### Technical Details
- No breaking changes: The bottom navigation still appears on `/dashboard`, `/editor`, `/applications`, and `/settings` via the `AppShell` wrapper (AppShell logic is unaffected)
- The bottom tabs constant and related imports are only used for the visual preview, so removing them has no side effects
- Padding adjustment ensures the page content doesn't feel cramped at the bottom

### Files Modified
1. `src/pages/Index.tsx`
