
## Merge Editor & Export into Single Expandable Card

### Overview
Replace the two separate navigation rows ("PDF Export Settings" and "Export Resumes") with a single expandable card containing two collapsible sub-sections. Add a cloud sync status indicator showing backup state.

### Changes to `src/pages/SettingsPage.tsx`

**1. Add imports**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Import `CloudCheck` (or use `Cloud` + `Check`) from `lucide-react` for the sync icon
- Import `ChevronDown` from `lucide-react` for expand/collapse indicator

**2. Replace the Editor & Export section content (lines 356-386)**

Remove the two `SettingsRow` navigation items and the `Separator` between them. Replace with a single `glass-elevated` card containing two collapsible sections:

**Section A -- "PDF Export Settings"**
- Use `Collapsible` with local state `pdfOpen`
- Trigger row: icon (Download), label "PDF Export Settings", right side shows current format summary (e.g., "Full, Badge on"), plus a rotating `ChevronDown`
- Content: inline the 3 controls currently in `PDFDefaultsSheet` (page numbers toggle, format picker, branding toggle) directly inside the collapsible content -- no more bottom sheet needed
- Remove `pdfDefaultsSheetOpen` state and the `PDFDefaultsSheet` component render

**Section B -- "Export Resumes"**
- Use `Collapsible` with local state `exportOpen`
- Trigger row: icon (Database), label "Export Resumes", right side shows cloud sync status badge
- Cloud sync visual: when user is signed in and has resumes, show a small `Cloud` icon with a green `Check` overlay and text "Backed up" in green; when guest, show a muted "Sign in to backup" badge
- Content: a "Manage Exports" button that opens the existing `DataExportSheet` (keep that sheet for the full import/export flow)
- For guests: show a compact sign-in prompt inside the collapsible content instead

**3. Cloud sync status indicator**

A small inline badge next to the "Export Resumes" row:
- Signed in + resumes synced: green `CloudCheck` icon + "Backed up" text (uses `text-[hsl(var(--success))]`)
- Signed in + pending offline changes: amber `Cloud` icon + "Pending" text
- Guest: muted lock icon + "Sign in"

### Technical Details

- The two `Collapsible` components use independent boolean states (`pdfOpen`, `exportOpen`)
- PDF settings controls are moved inline from `PDFDefaultsSheet` content -- the same `Switch`, format buttons, and branding toggle, using the same `pdfDefaults` state and `setPdfDefaults` from `useSettingsStore`
- The `PDFDefaultsSheet` component and its `pdfDefaultsSheetOpen` state are removed since the controls are now inline
- The `DataExportSheet` is kept for the full export/import workflow -- the collapsible just provides a quick-access entry point
- The offline sync status reads from `useOfflineSyncStore` pending count to determine "Backed up" vs "Pending"
- Collapsible animations use the built-in Radix animation (already configured in accordion styles)

### Files Modified
| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Replace Editor & Export section with two collapsible sub-sections; remove `PDFDefaultsSheet` usage; add cloud sync badge; add new imports |
