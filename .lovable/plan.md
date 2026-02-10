

# Combine AI Condensation with Scale-to-Fit in One-Page Wizard

## What Changes

The One-Page Wizard will gain a new combined flow: after AI condenses the resume text, the user can immediately download a scale-to-fit one-page PDF -- all from within the wizard sheet. This means the AI reduces text first (making content more readable), and then any remaining overflow is handled by scaling, resulting in larger, more readable text than scaling alone.

## User Flow

1. User opens One-Page Wizard from Preview page
2. AI analyzes and condenses the resume (existing behavior)
3. Results screen shows changes as before
4. **New**: "Apply & Download One-Page PDF" button replaces the old "Apply All Changes" button
5. Clicking it applies the condensed text to the resume, waits briefly for the DOM to update, then triggers `generateOnePagePDF` and downloads the result
6. A secondary "Apply Changes Only" text button is available for users who just want to edit without downloading

## Technical Details

### 1. `src/components/editor/ai/OnePageWizardSheet.tsx`

- Add new props: `templateElement` (HTMLElement | null), `selectedTemplate` (TemplateId), and `onExportOnePage` callback
- Add `handleApplyAndDownload` function that:
  1. Applies condensed text to the resume store (existing logic)
  2. Calls `onExportOnePage()` which triggers the one-page PDF export from PreviewPage
- Update footer buttons in the results state:
  - Primary: "Apply & Download One-Page PDF" (calls `handleApplyAndDownload`)
  - Secondary: "Apply Changes Only" (existing `handleApplyChanges`)
  - Ghost: "Cancel" (existing `handleReset`)

### 2. `src/pages/PreviewPage.tsx`

- Pass `onExportOnePage` callback to OnePageWizardSheet that:
  1. Closes the wizard sheet
  2. Waits 300ms for DOM to re-render with updated resume data
  3. Calls `handleExport('one-page', true, true)` to generate and download the scaled PDF
- Pass `templateElement={resumeRef.current}` and `selectedTemplate` to OnePageWizardSheet

### 3. No changes to `pdfGenerator.ts`

The existing `generateOnePagePDF` function handles the scale-to-fit correctly. The wizard just needs to call it after applying text changes.

## Result

A 3-page CV goes through this pipeline:
- AI condensation reduces it (e.g., 3 pages down to ~1.5 pages)
- Scale-to-fit handles the remaining overflow (e.g., 1.5 pages scaled at ~67% instead of 3 pages at ~33%)
- Final output: one page with much more readable text than scaling alone

