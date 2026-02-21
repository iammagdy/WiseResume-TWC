

# Remove the Black Bar and Its Buttons from Editor

## What will be removed

The following elements will be completely deleted from the editor page:

1. **Floating action pill** (lines 1435-1467 in `EditorPage.tsx`) — the portal-rendered bar containing:
   - **PDF button** — downloads resume as PDF
   - **Preview button** — switches to preview tab
   - **ATS button** — switches to ATS analysis tab

2. **The mobile tab bar for Preview/ATS** (lines 1207-1212) — the `TabsList` with Editor/Preview/ATS triggers that appears when NOT on the editor tab

3. **Preview tab bottom action bar** (lines 1230-1249) — the bar inside the Preview tab containing:
   - **Download button**
   - **Share button**
   - **Template button**
   - **Export/Eye button**

## What will be changed to fix the black gap

The root `<main>` element will get `bg-background` added to ensure no black background is ever visible, regardless of flex behavior.

The `Tabs` wrapper and `TabsContent` for editor will also get `bg-background` to eliminate any transparent gaps.

## Buttons removed (for relocation later)

| Button | Icon | Action |
|--------|------|--------|
| PDF | Download | Downloads resume as PDF |
| Preview | Eye | Switches to preview tab |
| ATS | BarChart3 | Switches to ATS analysis tab |
| Share | Globe | Opens share sheet |
| Template | LayoutTemplate | Opens template picker |
| Export | Eye | Navigates to /preview |

## Files changed

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Remove floating pill (lines 1435-1467), add `bg-background` to main/tabs, remove preview bottom bar |

No database changes. No new dependencies.
