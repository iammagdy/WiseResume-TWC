
## Final Export Screen Audit -- Findings and Fixes

### Screen Architecture

The "final screen before download" consists of two layers:

1. **PreviewPage** (`src/pages/PreviewPage.tsx`) -- Full-page preview with template rendering, template switcher, page break controls, and a bottom action bar with "Download" + chevron for more options.
2. **ExportOptionsSheet** (`src/components/editor/ExportOptionsSheet.tsx`) -- Bottom sheet listing 10 export types, PDF settings (page numbers, branding badge), progress bar, and the final CTA button.

### Issues Found

---

#### ISSUE 1 (Bug): Export button incorrectly disabled for Interview Prep when no cover letter exists

**Location:** `ExportOptionsSheet.tsx` line 302

The disable condition is:
```
disabled={isExporting || (!isPdfType && !isTextType && selectedType !== 'docx' && !hasCoverLetter)}
```

`interview-prep` is not a PDF type, not a text type, and not docx. So when `hasCoverLetter` is false, the "Start Practice" button is disabled even though interview prep has nothing to do with cover letters. The button should always be enabled for interview-prep.

**Fix:** Add `&& selectedType !== 'interview-prep'` to the disable condition:
```
disabled={isExporting || (!isPdfType && !isTextType && selectedType !== 'docx' && selectedType !== 'interview-prep' && !hasCoverLetter)}
```

---

#### ISSUE 2 (UX): Bottom action bar has hidden text labels on narrow screens, leaving icon-only buttons that are unclear

**Location:** `PreviewPage.tsx` lines 628-668

The secondary action row uses `<span className="hidden xs:inline ...">` which hides labels below 475px (the `xs` breakpoint). On a 320px iPhone SE, users see four cryptic icon-only buttons (back arrow, mic, share icon, folder icon on iOS) with no labels. This is confusing -- especially the mic icon for "Interview" and the share icon.

**Fix:** Change `hidden xs:inline` to always-visible labels with smaller text on tight screens. Use `text-xs` as default and `sm:text-sm` for larger screens. This ensures labels like "Edit", "Interview", "Share", and "Save" are always readable.

---

#### ISSUE 3 (UX): ExportOptionsSheet scrollable list clips at bottom on short phones

**Location:** `ExportOptionsSheet.tsx` line 179

The `max-h-[40vh]` for the options list, combined with the toggle switches and CTA button below, can cause the CTA to be pushed offscreen on phones shorter than 667px (iPhone SE, older Androids). The sheet is `max-h-[85vh]` but the internal content doesn't have proper overflow management for the full content block.

**Fix:** Change the outer `space-y-4 pb-6` div (line 177) to use `flex flex-col min-h-0` with the options list as `flex-1 overflow-y-auto` and the button + toggles as `shrink-0`. Add `pb-safe` to the bottom to respect home indicator. This ensures the CTA button is always visible at the bottom regardless of screen height.

---

#### ISSUE 4 (UX): No summary of what will be exported

Users see export type options but no confirmation of which resume or template they're exporting. On the final screen before download, there's no indicator like "Exporting: Magdy Saber -- Modern template".

**Fix:** Add a small summary line below the sheet title showing the resume name and current template:
```tsx
<p className="text-sm text-muted-foreground mt-1">
  {resumeName} -- {templateName} template
</p>
```

This requires passing `resumeName` and `templateName` as new optional props to `ExportOptionsSheet`.

---

#### ISSUE 5 (UX): "Download PDF" button label doesn't change when selecting non-default export

When a user selects "PDF (ATS-Optimized)", the button still says "Download PDF" -- this is technically correct but doesn't reassure the user that they selected the ATS version. The label should distinguish between the two PDF types.

**Fix:** Update `getButtonLabel()` to return "Download ATS PDF" for `ats-pdf` and "Download One-Page PDF" for `one-page` to make the action more specific.

---

#### ISSUE 6 (Minor): PreviewPage bottom bar second row has `flex-1` on all buttons causing uneven sizing on iOS

On iOS, when the "Save to Files" button appears (4 buttons total), all use `flex-1` which distributes space evenly. But the "Edit" button with back arrow icon looks cramped at 25% width. Non-iOS users see 3 buttons which is fine.

**Fix:** For the iOS case, give "Edit" a fixed `w-auto px-3` instead of `flex-1` since it's a short label, letting the other 3 buttons share remaining space evenly.

---

### Implementation Plan

| File | Change | Priority |
|------|--------|----------|
| `ExportOptionsSheet.tsx` line 302 | Fix disabled logic for interview-prep | High (bug) |
| `ExportOptionsSheet.tsx` line 157-164 | Make button labels more specific for ATS/one-page PDF | Medium |
| `ExportOptionsSheet.tsx` line 177-179 | Fix layout to keep CTA visible on short phones | Medium |
| `ExportOptionsSheet.tsx` props + header | Add resume name + template name summary | Medium |
| `PreviewPage.tsx` lines 628-668 | Show button labels on all screen sizes | Medium |
| `PreviewPage.tsx` lines 686-696 | Pass resumeName and templateName to ExportOptionsSheet | Medium |

### What Won't Change

- No changes to export business rules or PDF generation logic
- No changes to the export handler (`handleExport`) or its type signatures
- No changes to the core `onExport` callback signature
- Template rendering, page break logic, and download utilities remain untouched
- All existing `ExportType` values and their behaviors remain identical
