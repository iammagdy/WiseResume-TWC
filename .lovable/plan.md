

## Mobile Export/Preview Flow -- End-to-End Improvements

### What was tested

Walked through Dashboard -> Resume Detail -> Editor -> Preview -> Export Options sheet on a 360x800 viewport. Verified: template switching, page break indicators, all 10 export options visible and scrollable, the Download CTA, and secondary actions (Edit, Interview, Share). No console errors found.

### User Preferences Applied

- Primary CTA: Open Export Options sheet (not quick download)
- All 10 export options remain visible
- Button label: "Download CV" instead of "Download"

---

### Change 1: Make Export Options the primary CTA (HIGH)

**Current:** The big pink button says "Download" and triggers a quick PDF download. A small chevron-down button next to it opens the Export Options sheet.

**Problem:** Users must discover the tiny chevron to access all export formats. The user wants the Export Options sheet to be the primary action.

**Fix:** Swap the button roles:
- The large primary button becomes "Export CV" and opens the Export Options sheet
- A smaller secondary button offers "Quick PDF" for power users who just want the default download

**File:** `src/pages/PreviewPage.tsx` (lines 596-625)
- Change the primary button's onClick from `handleQuickDownload` to `() => setShowExportSheet(true)`, label from "Download" to "Export CV"
- Change the chevron button to a quick-download button with a Download icon

---

### Change 2: Rename Export sheet CTA to "Download CV" (LOW)

**Current:** The bottom CTA in the ExportOptionsSheet says "Download PDF", "Download DOCX", etc.

**Fix:** Update `getButtonLabel()` so:
- PDF types say "Download CV" instead of "Download PDF"
- ATS PDF says "Download CV (ATS)"
- One-page says "Download CV (1 Page)"
- Keep DOCX, LinkedIn, plain text labels as-is since they clarify format

**File:** `src/components/editor/ExportOptionsSheet.tsx` (lines 162-172)

---

### Change 3: Export sheet footer options jump when scrolling (MEDIUM)

**Current:** The "Page Numbers" and "WiseResume Badge" toggle section sits between the scrollable list and the CTA button. When users scroll the option list, the toggles and CTA stay in view -- this is correct. However, the toggles appear/disappear based on selected type, causing a layout jump.

**Fix:** Always render the toggle container (with a consistent height) but only show toggle content when relevant. Use opacity + pointer-events instead of conditional rendering so the layout doesn't jump. This is a small CSS-only change.

**File:** `src/components/editor/ExportOptionsSheet.tsx` (lines 260-296)
- Wrap the toggle section in a container that always takes space but hides content via opacity when not applicable

---

### What Passed (No changes needed)

| Area | Status |
|------|--------|
| Template switcher chips (44px) | OK |
| Bottom action bar safe-area | OK |
| Secondary buttons (Edit/Interview/Share at 44px) | OK |
| Export sheet scrollability | OK |
| All 10 export options visible | OK |
| Export progress bar | OK |
| Error toasts with retry | OK |
| iOS share/save-to-files flow | OK |
| Android anchor download | OK |
| Page break indicators | OK |
| PDF generation (no console errors) | OK |

---

### Technical Changes Summary

| File | Change | Lines |
|------|--------|-------|
| `src/pages/PreviewPage.tsx` | Swap primary button to open Export sheet; secondary becomes quick PDF | ~596-625 |
| `src/components/editor/ExportOptionsSheet.tsx` | Rename CTA labels to "Download CV" variants; stabilize toggle layout | ~162-172, ~260-296 |

Total: 2 files, surgical changes only. No export logic, PDF generation, or download utility changes. No component removals. Desktop unaffected.

