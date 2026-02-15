

## Add Minimum Scale Warning in Export Options Sheet

### Change

**File: `src/components/editor/ExportOptionsSheet.tsx`**

Add a warning message below the one-page option's scale badge when `onePageScale` is not null and is below 50%. Use the existing `Alert` component from `@/components/ui/alert` with a destructive variant, showing an icon and a short message like: "Text may be too small to read comfortably at this scale. Consider using the AI One-Page Wizard to condense content first."

### Details

1. Import `Alert`, `AlertDescription` from `@/components/ui/alert` and `AlertTriangle` from `lucide-react`
2. After the one-page option's existing scale badge (around line 140), add a conditional block:
   - Show only when `onePageScale !== null && onePageScale < 50`
   - Render an `Alert` with `variant="destructive"` containing a brief warning and a suggestion to use the AI wizard
3. No logic changes -- purely a UI addition using existing components and the already-computed `onePageScale` state

