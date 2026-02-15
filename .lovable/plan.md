
## Mobile Export Module Audit

### Pipeline Summary

```text
ResumeData (Zustand store)
  -> Template component renders HTML (with ExtraSections for extras)
  -> html2canvas captures rendered DOM at 2x scale
  -> pdf-lib slices canvas into pages with smart breaks
  -> Footer (page numbers + branding) added
  -> Blob returned
  -> downloadFile() dispatches per-platform: iOS (share/open/data-url), Android (window.open), Desktop (anchor click)
```

### Bugs Found

---

#### BUG 1 (Medium): Android download uses `window.open` -- no filename, potential popup block

`downloadMobile()` in `src/lib/downloadUtils.ts` (line 99-105) calls `window.open(url, '_blank')` which:
- Opens the PDF in a browser tab but the user cannot save it with the correct filename (Chrome shows it as a random blob URL)
- May be blocked by popup blockers on some Android browsers
- Does not use the `fileName` parameter at all

**Fix:** Use the `<a download>` pattern (same as desktop) for Android Chrome, which triggers a proper named download. Only fall back to `window.open` if the anchor click fails.

```typescript
function downloadMobile(blob: Blob, fileName: string): DownloadResult {
  // Try anchor download first (works on most Android browsers)
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { success: true, method: 'anchor' };
  } catch {
    // Fallback to window.open
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { success: true, method: 'open' };
  }
}
```

---

#### BUG 2 (Medium): DOCX export missing extra sections

`src/lib/docxGenerator.ts` only exports: Contact, Summary, Experience, Education, Skills, Certifications.

Missing from DOCX: Projects, Awards, Languages, Publications, Volunteering, Hobbies, References.

Users who add these sections and export as DOCX will silently lose that data.

**Fix:** Add the missing sections to `generateAndDownloadDOCX()` after the Certifications block, following the same pattern (heading + paragraphs).

---

#### BUG 3 (Low): Plain text export missing Volunteering, Publications, Hobbies, References

`generatePlainText()` in `src/lib/shareUtils.ts` includes Projects, Awards, Languages but omits Volunteering, Publications, Hobbies, and References.

**Fix:** Add the missing sections after the Languages block.

---

#### BUG 4 (Low): `ResumeDetailPage` statically imports `generatePDF` from `pdfGenerator`

Line 24: `import { generatePDF } from '@/lib/pdfGenerator'` -- this pulls the heavy `html2canvas` + `pdf-lib` bundle (~200KB) into the ResumeDetailPage chunk even though it's a lazy route. Not a bug per se, but a performance regression that was supposed to be fixed.

**Fix:** Convert to dynamic import inside `handleDownload`:
```typescript
const { generatePDF } = await import('@/lib/pdfGenerator');
```

---

### What's Already Working Well

- **iOS download flow**: Robust 3-tier fallback (navigator.share -> window.open -> data URL anchor) with proper AbortError handling for cancelled shares
- **Export progress UI**: Clear stage-based progress bar (Preparing -> Capturing -> Paginating -> Embedding -> Finalizing -> Downloading) with percentage
- **Error handling**: Typed `PdfGenerationError` with codes (EMPTY_CANVAS, MISSING_ELEMENT, CAPTURE_FAILED), retry logic (up to 2 retries), and human-readable toast messages with retry action
- **Button disable during generation**: `isGenerating` state properly disables all export buttons during PDF generation, preventing double-taps
- **iOS "Save to Files" button**: Dedicated button for iOS users that triggers `navigator.share` with a "Save to Files" hint toast
- **Mobile capture preparation**: `prepareForCapture()` fixes element width to 612px, removes CSS transforms, makes parent containers overflow:visible, and scrolls to top -- all critical for iOS Safari compatibility
- **Template preview rendering**: All 30 templates now render in preview with ExtraSections component appended
- **Page break intelligence**: Smart break algorithm avoids cutting through `data-break-avoid` blocks and protects section header orphaning

### Implementation Plan

| File | Change | Priority |
|------|--------|----------|
| `src/lib/downloadUtils.ts` | Fix Android download to use anchor pattern with filename | High |
| `src/lib/docxGenerator.ts` | Add Projects, Awards, Languages, Publications, Volunteering, Hobbies, References sections | High |
| `src/lib/shareUtils.ts` | Add Volunteering, Publications, Hobbies, References to `generatePlainText()` | Medium |
| `src/pages/ResumeDetailPage.tsx` | Convert static `generatePDF` import to dynamic import | Low |

### What Won't Change

- Core PDF generation algorithm (html2canvas -> pdf-lib pipeline)
- iOS download flow (already robust with 3-tier fallback)
- Export progress UI and error handling
- Page break logic and template-aware pagination
- Button disable behavior during generation
- All public function signatures remain identical
