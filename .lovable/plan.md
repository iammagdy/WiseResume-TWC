

## PDF Generator Pipeline Audit

### Pipeline Architecture

The PDF generation follows this path:

```text
ResumeData (Zustand store)
  -> Template component renders HTML (e.g., ModernTemplate)
  -> html2canvas captures the rendered DOM as a canvas
  -> pdf-lib slices the canvas into pages using smart breaks
  -> Page footer (numbers + branding) added
  -> PDF blob returned for download
```

Settings that affect export: templateId, customization (accent color, fonts, spacing, margins, line height, page format A4/Letter), page break mode (auto/manual), PDF options (page numbers, branding badge), and export type (design-enhanced, ATS-optimized, one-page, cover letter, combined, DOCX, plain text, LinkedIn).

### Bugs Found

---

#### BUG 1 (Critical): 28 of 30 templates silently drop extra sections

Only `ModernTemplate` renders all resume sections (Awards, Projects, Volunteering, Publications, Hobbies, References). The `CreativeTemplate` renders Certifications but nothing else. All other 28 templates only render Summary, Experience, Education, Skills, and (in some cases) Certifications.

If a user adds Projects, Awards, Languages, Publications, Volunteering, Hobbies, or References and uses any template other than Modern, those sections are invisible in both preview and PDF.

**Impact:** Data loss in export. Users may submit resumes missing sections they explicitly added.

**Fix:** Add the missing extra sections to all templates. To keep this manageable and targeted, I will add a reusable `ExtraSections` component that renders the 7 missing section types (Awards, Projects, Publications, Volunteering, Hobbies, References, Languages) in a template-neutral style, then import it into each template file. Each template will call `<ExtraSections resume={resume} />` at the bottom. Templates that already render specific sections (like CreativeTemplate with certifications) will keep their existing rendering.

This approach:
- Adds all missing sections without modifying existing template layouts
- Keeps template-specific styling for sections they already handle
- Is a single shared component, easy to maintain

---

#### BUG 2 (Medium): `LivePreviewPanel` filterResume and SECTION_LABELS missing `languages`

`LivePreviewPanel.tsx` line 50-62: `SECTION_LABELS` doesn't include `languages`. Line 77-93: `filterResume` doesn't handle `languages`. If a user toggles section visibility in the live preview, languages won't be affected.

**Fix:** Add `languages: 'Languages'` to `SECTION_LABELS` and add `languages: hidden.has('languages') ? [] : resume.languages` to `filterResume`.

---

#### BUG 3 (Medium): PreviewPage `availableSections` fallback is incomplete

`PreviewPage.tsx` lines 158-164: The fallback only lists summary, experience, education, skills, and certifications. It misses awards, projects, publications, volunteering, hobbies, references, and languages. This means manual page breaks can't target these sections when the DOM scan fails.

**Fix:** Add the missing sections to the fallback list.

---

#### BUG 4 (Low): PreviewPage template picker only shows 12 of 30 templates

`PreviewPage.tsx` lines 65-78: The `templates` array for the template selector dropdown only includes 12 templates. Users who arrive at Preview with one of the other 18 templates can see their resume but can't switch back if they change templates.

**Fix:** Extend the `templates` array to include all 30 templates.

---

#### BUG 5 (Low): Static import of pdfGenerator in PreviewPage negates dynamic import optimization

`PreviewPage.tsx` line 51 has `import { getSectionsInDOMOrder, PdfGenerationError } from '@/lib/pdfGenerator'`. Since `pdfGenerator.ts` imports `html2canvas` and `pdf-lib` at the top level, this static import pulls ~200KB into the PreviewPage chunk even though the export handler uses dynamic `import()`.

**Fix:** Move `getSectionsInDOMOrder` and `PdfGenerationError` to a separate lightweight utility file (e.g., `pdfUtils.ts`) that doesn't import the heavy libraries, or inline the small `PdfGenerationError` class and dynamically import `getSectionsInDOMOrder`.

---

### Implementation Plan

#### Step 1: Create shared `ExtraSections` component
Create `src/components/templates/shared/ExtraSections.tsx` that renders Awards, Projects, Publications, Volunteering, Hobbies, References, and Languages sections with neutral styling and proper `data-section` and `data-break-avoid` attributes.

#### Step 2: Add `ExtraSections` to all templates missing extra sections
Import and render `<ExtraSections>` in all 28 templates that are missing these sections. Skip sections already handled by a specific template (e.g., CreativeTemplate handles certifications).

#### Step 3: Fix `LivePreviewPanel` languages support
Add `languages` to `SECTION_LABELS` and `filterResume`.

#### Step 4: Fix PreviewPage `availableSections` fallback
Add all missing section types to the fallback logic.

#### Step 5: Extend PreviewPage template picker to all 30 templates
Update the `templates` array to include all 30 templates.

#### Step 6: Extract lightweight PDF utilities
Move `getSectionsInDOMOrder`, `PdfGenerationError`, `estimatePageCount`, and `estimateOnePageScale` to a new `src/lib/pdfUtils.ts` file that doesn't import `html2canvas` or `pdf-lib`. Update imports in `PreviewPage.tsx` and `ExportOptionsSheet.tsx`.

### What Won't Change
- No changes to the core PDF generation algorithm (html2canvas -> pdf-lib pipeline)
- No changes to page break logic, smart break positioning, or template-aware pagination
- No changes to data models, types, or store
- No changes to export UX, error handling, or download utilities
- No changes to customization CSS injection system
- All existing template layouts preserved; extra sections appended at bottom
- All 30 template lazy-loading maps remain intact

