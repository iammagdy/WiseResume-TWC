# Resume Template Audit — PDF Export Truncation, ATS Friendliness & Rendering Bugs

**Scope:** All 30 resume templates in `src/components/templates/` and the PDF export pipeline (`src/lib/pdfGenerator.ts`, `src/lib/pdfTextLayer.ts`, `src/lib/pdfUtils.ts`, `src/hooks/useOnePageExport.ts`, `src/styles/print-safe.css`).

**Date:** 2026-04-21

**Method:** Read every PDF-relevant module end-to-end; sampled 12 of the 30 templates representing each layout family (single-column, two-column grid, label/content grid, photo header, infographic, hyper-compact). Cross-checked the page-break algorithm and the hidden text layer against the rendered DOM markers (`data-section`, `data-break-avoid`, `data-break-child`).

**Severity legend:** **P0** — corrupts the exported PDF or misleads ATS in ways the user cannot see. **P1** — likely visible defect or measurable ATS reduction. **P2** — minor / cosmetic / edge case.

---

## Executive summary

The export pipeline is a **rasterised** pipeline: every template is captured by `html2canvas` into a single tall PNG, sliced into page-sized strips, embedded into a `pdf-lib` PDF, and an **invisible text layer** is drawn underneath so ATS parsers and Ctrl-F still work. That two-layer strategy is correct in concept but, in practice, several gaps mean the visible PDF and the text layer can disagree, content can be silently clipped, and a handful of templates produce ATS-hostile artifacts that the hidden layer cannot fully rescue.

The most impactful problems, in order:

1. **The hidden text layer is decoupled from the visible page.** It is generated from `ResumeData` in a hard-coded canonical order and split evenly across pages, regardless of which template is rendered or how the visible content was paginated. Page 2's invisible text rarely matches Page 2's image, ATS parsers that score by section position get noisy signals, and a few templates' visual reading order (e.g. Healthcare puts Certs before Experience) is the inverse of the text layer.
2. **The truncation guard accepts up to 19 % loss.** `captureTemplateAsCanvas` only throws if `canvas.height < expectedHeight × 0.8`, so a fifth of the resume can be silently cut without raising an error.
3. **Oversized single entries (one experience taller than one page) split mid-paragraph.** The break-snapping algorithm clamps the snapped break to `prev + sourceHeightPerPage`, so when no `[data-break-child]` is found within ~50 % of a page, the slice falls back to the fixed-interval break and crops a line of text down the middle (in the image — the text layer still has it, but visually a line is bisected).
4. **`generateOnePagePDF` can request a canvas larger than browsers can produce.** It computes `dynamicScale = min(5, SCALE / fitScale)`, so a 4-page resume forced onto one page asks `html2canvas` for a 5× canvas; on iOS Safari and some Android browsers this exceeds the per-canvas memory cap and either throws or returns a truncated image — and the truncation guard above will not catch it if it stays within 80 %.
5. **The image-only output path is the default.** Unless the text layer succeeds, the PDF is image-only and ATS parsers see nothing. The text-layer call is wrapped in a try/catch that swallows the error with `console.warn('[PDF] Text layer rendering failed, PDF will still work as image-only')` — meaning a single error in `extractResumeText` produces a PDF that looks fine but is invisible to every ATS.

A handful of templates (Cyber, DevOps, Infographic, Portfolio, Sales metric grid, photo headers in Creative/Designer) have additional, template-specific defects that further reduce ATS friendliness or silently mangle content. Details follow.

---

## Architecture recap

- **Templates:** 32 React components in `src/components/templates/`, each exporting a `<TemplateName>Template` that reads `ResumeData` and writes a single tree of HTML using Tailwind classes plus inline `style={{...}}` for accent colours.
- **Section markers:** Templates wrap sections in `<section data-section="experience">…</section>` and individual entries in `data-break-avoid` blocks; long inner content uses `data-break-child` so the snapper can split inside an oversized entry.
- **Capture:** `prepareForCapture` forces width to the chosen page width (612 px Letter, 595 px A4), strips `transform`, scrolls everything into view, and runs `html2canvas` at scale 2.
- **Pagination:** Fixed-interval breaks every `printableHeight` (page height − 44 pt footer reserve), then `snapBreaksToContent` adjusts each break in three tiers — section-level snap, then `[data-break-child]` snap inside an oversized entry, then any direct child element. Each break is then clamped to `[prev + 60, prev + sourceHeightPerPage]`.
- **Slice-and-embed:** Each strip is drawn into a fresh canvas, encoded to PNG, embedded with `embedPng`, drawn at `pageHeight − segmentPdfHeight` so the top of the slice sits at the top of the PDF page.
- **Text layer:** `extractResumeText(resume)` returns a flat array of strings in canonical order; `renderTextLayerForPage` slices the array by `Math.ceil(total / numPages)` and writes them as transparent text near the top of each page.
- **One-page mode:** `generateOnePagePDF` re-captures with a *higher* scale chosen to cancel the down-fit, then draws the whole capture at `min(printableHeight)` height into a single page.
- **Cover-letter path:** `generateCoverLetterPDF` uses pure pdf-lib + `wrapText` — selectable text, fully ATS-friendly. **Combined PDF** stitches a real-text cover letter to a rasterised resume.

No template uses the configured `fixed-sidebar` layout from `templateConfig.ts`. Two layouts live in code (`linear`, `linear-grid`); the third value is dead.

---

## Cross-cutting findings

### 1. P0 — Hidden text layer is built from data, not from the rendered DOM

**Where:** `src/lib/pdfTextLayer.ts:12-149`, called from `src/lib/pdfGenerator.ts:431-440` and `:743-749`.

`extractResumeText` walks `ResumeData` in a hard-coded order: contact → summary → experience → education → skills → certifications → awards → projects → publications → volunteering → languages → hobbies → references. It then writes every line at the top of the page with the same fixed line-height and column position, and `renderTextLayerForPage` slices the array uniformly across pages.

Consequences:

- **Reading order can disagree with the visual order.** `HealthcareTemplate` renders Certifications above Experience, `AcademicTemplate` renders Education above Experience, `SwissTemplate` uses a label-column to the left of each section, `CyberTemplate` renders Skills above Experience. The text layer always uses the data order, so an ATS that scores by *vertical position of the first match* sees a different ranking than a human reading the visual page.
- **Page-to-page mismatch is the norm, not the exception.** The text layer is split into equal slices regardless of where the image was actually paginated, so Page 2's invisible text bears almost no relationship to Page 2's visible image. Most modern ATS parsers ignore this, but parsers that segment by page (older Taleo, government USAJOBS extractors) will misattribute lines.
- **Section names in the text layer differ from the headings the user picked.** `CyberTemplate` shows "Operations Log", "Security Toolkit", "Credentials" but the text layer says "Experience", "Skills", "Education". A reviewer copy-pasting from the open PDF gets the visible text via OCR / image; a parser that walks the PDF text stream gets the canonical names. Either way, the two never agree, which can confuse human screeners who notice the discrepancy when they paste a snippet.
- **The text layer is silent on failure.** `pdfGenerator.ts:437-439` and `:747-748` swallow any throw with `console.warn('PDF will still work as image-only')`. The user sees a normal-looking PDF; ATS sees a flat image and the resume scores zero on keyword match. There is no telemetry that this happened.
- **No safety net for custom sections.** `extractResumeText` enumerates a fixed set of arrays (contact, summary, experience, education, skills, certifications, awards, projects, publications, volunteering, languages, hobbies, references). `ResumeData` does not currently carry a `customSections` field, so this is *not* a present bug — but if a future feature adds user-defined sections, those will be silent-dropped from the text layer until this function is updated.

**Fix direction:** Build the text layer by walking the rendered DOM (`querySelectorAll('[data-section]')`) in *visual order*, mirroring what the user sees, and align text-layer pagination to the same `smartBreaks` array used for the image. Add a structured warning to the export-progress channel when the text layer fails so we can detect silent regressions.

---

### 1b. P0 — Hidden text layer truncates when the per-page line budget overflows

**Where:** `src/lib/pdfTextLayer.ts:191-242` (`renderTextLines`).

The renderer wraps each input line at `font.widthOfTextAtSize > pageWidth − 20`, then writes them top-down with `fontSize = 4`, `lineHeight = 5`, `margin = 10`. On a Letter page that is `(792 − 20) / 5 ≈ 154` wrapped lines per page. The loop hard-stops at:

```ts
for (const line of wrappedLines) {
  if (y < margin) break;
  ...
  y -= lineHeight;
}
```

Because `renderTextLayerForPage` allocates lines to pages by raw input-line count *before* wrapping, a long-resume page that contains 50 input lines (each averaging 4 wrapped lines after the 20pt-margin width constraint) produces 200 wrapped lines but the renderer silently drops everything past line ~154. ATS sees the first ~75 % of that page's hidden text and nothing else; the user has no warning.

This stacks with finding #1: pages where the visible image is dense (lots of bullets) are exactly the pages where the wrap-then-truncate path bites.

**Fix direction:** Wrap *first* in `renderTextLayerForPage`, distribute *wrapped* lines across pages, and assert no overflow. Or shrink `fontSize` adaptively when `wrappedLines.length × lineHeight > pageHeight − 2 × margin`.

---

### 2. P0 — Truncation guard tolerates 19 % loss

**Where:** `src/lib/pdfGenerator.ts:344-351`.

```ts
const expectedHeight = sourceElement.scrollHeight * scale;
if (canvas.height < expectedHeight * 0.8) {
  throw new PdfGenerationError(...);
}
```

If `html2canvas` returns a canvas that's 81 % of the expected height (a fairly common iOS/Safari outcome on tall content), the check passes. The bottom 19 % — typically the last entry or two of Experience plus the entire Education / Skills / Extra sections — vanishes, the user receives a 2-page PDF instead of a 3-page PDF, and the only signal is a missing chunk at the end. The hidden text layer still contains everything, so an ATS may extract it, but a human reviewer sees a truncated resume.

**Fix direction:** Tighten the threshold to 0.98 (canvas heights jitter by a few pixels on retina displays, but not by 20 %). Add a fallback that re-captures at a lower scale if the strict check fails, instead of erroring.

---

### 3. P0 — Oversized entries silently slice through text in the image

**Where:** `src/lib/pdfGenerator.ts:584-612` (`snapBreaksToContent`).

The break-snapping algorithm has three tiers for an oversized `data-break-avoid` entry: snap to a `[data-break-child]` boundary within ~50 % of a page; otherwise snap to a direct child boundary; otherwise leave the break at the fixed-interval position. The final clamp is:

```ts
nextBreak = Math.min(Math.max(snapped, prevBreak + HEADING_GUARD), prevBreak + sourceHeightPerPage);
```

A real-world failure mode: a single experience block whose description + 8 achievement bullets pushes it past one page, where the `<ul>` is marked `data-break-child` but the individual `<li>`s are *also* marked `data-break-child` (see `ModernTemplate.tsx:23-27`). The snapper finds many candidates, picks the closest, but if the closest sits inside the bottom 10 % of an oversized block the clamp pushes the break back to `prev + sourceHeightPerPage`, which lands somewhere in the middle of an `<li>`. The image is sliced through a line of text, producing a half-line of clipped pixels at the top of the next page.

The text layer still contains the full sentence (good for ATS), but the printed output looks broken.

**Fix direction:** When all tiers fall back to the fixed break inside an oversized entry, walk *upward* from `prev + sourceHeightPerPage` to find the first whitespace-only horizontal band (a row of pixels where every pixel is white in the captured canvas) and snap the break there. Alternatively, give every list item `<li>` a `data-break-after-allowed` marker and forbid breaks inside text runs.

---

### 4. P0 — `generateOnePagePDF` can request unrenderable canvases

**Where:** `src/lib/pdfGenerator.ts:705-718`.

```ts
const dynamicScale = fitScale < 1 ? Math.min(5, SCALE / fitScale) : SCALE;
```

For a 4-page Academic resume forced onto one page, `fitScale ≈ 0.25`, so `dynamicScale = min(5, 8) = 5`. At a 612-px width and a ~3000-px source height, this asks `html2canvas` to allocate a 3060 × 15 000 px canvas (~45 MP). iOS Safari caps single-canvas area at 16 MP (4096 × 4096 effective). The result is either a thrown exception or — worse — a silently truncated canvas, which then sails past the 80 % truncation guard because *expected* height was computed from the same scale.

**Fix direction:** Cap `dynamicScale` such that `sourceWidth × dynamicScale × totalHeight × dynamicScale ≤ 14_000_000`. When the cap forces the scale below 2, warn the user that one-page output may look soft at this length and suggest two-page mode.

---

### 5. P1 — `data-pdf-force-layout` styles never apply during export

**Where:** `src/styles/print-safe.css` (the entire file is gated on `[data-pdf-force-layout]`); `src/lib/pdfGenerator.ts:178-233` (`prepareForCapture`).

`prepareForCapture` does not add `data-pdf-force-layout` to the source element. Grepping the codebase shows the attribute is *referenced only* in the CSS — nothing in the React tree, the PDF pipeline, or any test sets it. Every rule in `print-safe.css` (strip backdrop-filter, neutralise box-shadow, force sticky → static, force flex-wrap) is therefore dead code.

This means templates that rely on `backdrop-filter`, `position: sticky`, or animated gradients (none of the 32 templates do today, but `ContactLinks` icons render through `convertSvgsToImages` and the cover-letter preview uses sticky headers) get captured with their live styles, which html2canvas may render incorrectly.

**Fix direction:** Either set `sourceElement.setAttribute('data-pdf-force-layout', 'true')` inside `prepareForCapture` (and remove on cleanup), or delete `print-safe.css` and the dead selector. Decide which based on whether the rules are still needed.

---

### 6. P1 — Photo headers can poison the canvas or render blank

**Where:** `src/components/templates/CreativeTemplate.tsx:16-22`, `src/components/templates/DesignerTemplate.tsx:14-16`.

Two templates render `<img src={contactInfo.photoUrl}>`:

- If the photo lives on a different origin from the app and the response lacks `Access-Control-Allow-Origin`, html2canvas will *taint* the canvas; subsequent `canvas.toDataURL('image/png')` throws `SecurityError` and the entire export fails. The current Supabase Storage public-bucket URLs do return CORS headers, but signed URLs and S3-hosted user uploads may not.
- `DesignerTemplate.tsx:15` sets `loading="lazy"` on the photo. html2canvas does not trigger lazy loading; if the offscreen capture fires before the browser paints the image, the photo is captured as empty space (or as a broken-image placeholder on Firefox).
- `CreativeTemplate.tsx:13-22` falls back to initials-in-a-gradient circle when no photo is set; the gradient is `bg-gradient-to-r from-violet-600 to-purple-700` which html2canvas renders correctly but at lower fidelity than the live page.

Beyond rendering, photos themselves are an **ATS risk** — many parsers (Workday, Greenhouse) explicitly recommend against photos and a few drop the entire resume on photo detection. Templates that *support* photos should warn the user when targeting US/UK roles.

**Fix direction:** Drop `loading="lazy"` from any image inside `[data-resume-template]`, set `crossOrigin="anonymous"` on `<img>` so html2canvas can detect taint early, and add an "ATS warning" badge in the editor when the active template uses a photo.

---

### 7. P1 — `formatDisplayDate` is called without parsing date partials

**Where:** every template, e.g. `ExecutiveTemplate.tsx:48`, `ModernTemplate.tsx:20`.

`formatDisplayDate(exp.startDate)` is called even when `startDate` is the empty string (e.g., for an entry the user filled out partially). I haven't read `formatDisplayDate` in this pass, but the rendered output includes `' – '` between empty start and end dates, producing visually broken " – Present" headers on entries that lack a start date. The text layer's date string at `pdfTextLayer.ts:40` filters empties and skips the line, so ATS is fine; the image is not.

**Fix direction:** wrap the date span in a conditional `{exp.startDate && (<span>…</span>)}` in each template, or have `formatDisplayDate` return `null` for empty input and have callers conditionally render.

---

### 8. P2 — Mixed dash characters make date ranges inconsistent across templates

`Modern`, `Cyber` and others use `' – '` (en-dash with spaces). `Executive` uses `' — '` (em-dash). `Mono` uses `' — '`. `Compact` uses `' – '`. ATS-wise this is irrelevant — `extractResumeText` flattens to ` – ` consistently — but a screener flipping between two templates of the same résumé sees inconsistent typography.

---

## Per-template findings

For each template I list (a) Layout family, (b) ATS verdict, (c) Truncation/render bugs.

> **ATS verdict legend.** ✅ — clean: single column, canonical heading words, plain skill text. ⚠ — works through the hidden text layer but the *visible* page would confuse a human screener who copy-pastes. ❌ — defect that the text layer cannot rescue, or active risk of being dropped by automated parsers.

### Modern (ModernTemplate.tsx)

- **Layout:** Single column, full width.
- **ATS verdict:** ✅ Canonical headings ("Summary", "Experience", "Education", "Skills"), purple accent does not bleed into text colour, skills as bullet pills but the text layer flattens them.
- **Bugs:** Both achievements *and* responsibilities lists are rendered if both exist, with no visual divider — a user who fills in both gets two consecutive bullet lists with identical styling. (Same pattern in 27 other templates — flagged once here.)

### Classic (ClassicTemplate.tsx)

- Same single-column shape as Modern with a serif font and uppercase headings. ✅ ATS-friendly.

### Minimal (MinimalTemplate.tsx)

- Single column, ultra-light typography (`font-light`, `text-gray-400` headings, `tracking-widest`).
- **ATS verdict:** ✅ Skills rendered as plain comma-joined text (line 100), the cleanest ATS form.
- **Bug:** Summary section has no heading at all (line 65). The text layer still labels it "Summary", but a human screener viewing the image cannot tell summary apart from a stray paragraph above Experience.

### Clean (CleanTemplate.tsx)

- Identical pattern to Minimal. ✅.

### Compact (CompactTemplate.tsx)

- **Layout:** Fixed `w-[612px] min-h-[792px]`, font-size `text-xs`/`text-[10px]` to pack 2 pages of content into 1.
- **ATS verdict:** ✅ but the small text size hurts OCR reliability on scanned PDFs (not relevant to this app's exports — but if an ATS re-OCRs the rasterised image, characters may misread).
- **Bug:** Hard-coded `w-[612px]` fights `prepareForCapture`'s width override on A4 export (595 px). Result is a 612-px-wide source rendered into 595-px-wide page, scaled down by `globalScaleFactor = 0.97`. Visually 3 % shrinkage; not visible. Same pattern in **Academic, Healthcare, Sales, Elegant**.

### Mono (MonoTemplate.tsx)

- Single column, ultra-quiet typography. ✅ Plain comma-joined skills, text-layer-canonical heading words.

### Swiss (SwissTemplate.tsx)

- **Layout:** `grid grid-cols-[100px_1fr]` for every section — heading sits in a left label column, content sits in a right column.
- **ATS verdict:** ⚠ The text *image* puts the heading at the same vertical position as the first content line; a human pasting from the PDF gets `Experience  Senior Engineer at Acme` on one line. The hidden text layer puts heading on its own line so automated ATS is fine.
- **Bug:** `data-section="experience"` is on the wrapping `<section>`, but the heading inside that section is the left grid cell — `snapBreaksToContent`'s "section-level snap" treats the entire two-column block as one section, which is correct, but if the right column overflows past one page the entire section gets pushed to the next page (Tier 1), wasting a partial page of vertical space.

### Federal (FederalTemplate.tsx)

- Single column, gov-style "Objective" / "Work Experience" / "Skills & Qualifications" headings.
- **ATS verdict:** ✅ Skills laid out in 2-column grid (line 59) but each cell is a single skill word, so order doesn't matter to a parser.
- **Note:** Recommended for USAJOBS — but real federal résumés want every entry to include `Hours per week`, `Supervisor name + permission to contact`, `Salary`, `Series/Grade`. None of those fields exist in `ResumeData`. The "Federal" name oversells the template; calling it "Government" or "Public Sector" would be more honest.

### Banking, Consulting, Corporate, Legal, Product, Startup, Marketing, Professional, Sales

- **Layout:** All single-column with template-specific accent colours.
- **ATS verdict:** ✅ for Banking, Consulting, Corporate, Legal, Product, Startup, Marketing, Professional. ⚠ for Sales (see below).
- **Sales-specific bug (P1):** `SalesTemplate.tsx:14-18` defines `extractMetric` that pulls the first numeric token off each achievement and renders it as a giant green metric in a 2-column "metric card" grid:
  ```
  /^(\$?[\d,]+%?|\d+\+?)/
  ```
  False positives are common: `"5+ years of B2B sales"` → metric `"5+"`, body `"years of B2B sales"` (renders "5+" as a big green number, misleading). `"7 direct reports across EMEA"` → metric `"7"`, body `"direct reports across EMEA"` (highlights "7" as if it were a sales win). The grid also splits each `<li>` into its own card via `grid grid-cols-2`, which the snapper treats as one `data-break-child` block; if there's an odd number of cards, the last card drops to the next page leaving an awkward half-row.

### Creative (CreativeTemplate.tsx)

- **Layout:** Coloured header band with gradient + photo, single-column body.
- **ATS verdict:** ❌ Photo is rendered as `<img>`. See cross-cutting #6 for the photo risks.
- **Bug:** Header uses `bg-gradient-to-r from-violet-600 to-purple-700` with white text. html2canvas renders the gradient as a flat fill in some browsers, occasionally producing white-text-on-white when the gradient resolution drops. Verify visually before shipping.

### Designer (DesignerTemplate.tsx)

- **Layout:** Photo header (gray-900 band), single-column body.
- **ATS verdict:** ❌ Same photo concerns + ⚠ "Profile" used instead of "Summary" — text-layer says "Summary" so parsers are fine, but a human screener pasting from the visible page sees a heading the parser does not.
- **Bug:** `loading="lazy"` on the photo (line 15) — see cross-cutting #6.

### Executive (ExecutiveTemplate.tsx)

- **Layout:** Single-column header + single-column experience + **2-column grid for Education + Skills**.
- **ATS verdict:** ⚠ The 2-column grid at the bottom: the rasterised image places Education (left) and Skills (right) at the same vertical position. PDF text extractors that read in visual order may interleave: "Education  Skills  M.S. in CS  Python  Stanford  React  ...". The text layer fixes this but tools that ignore the text layer (some legacy ATS parse the image with their own OCR) will misread.
- **Bug:** `Skills` are rendered as comma-separated `<span>`s using a CSS pseudo-element trick: `after:content-[','] after:mx-0.5 last:after:content-none`. Pseudo-element content is **not captured by html2canvas** in some browser/version combinations — the result is skills with no separators rendered as one giant run-on word. Verify by exporting an Executive résumé with 10+ skills.

### Elegant (ElegantTemplate.tsx)

- **Layout:** Centred header band, single-column body, **2-column grid for Education + Certifications**.
- **ATS verdict:** ⚠ Same column-interleave concern as Executive.
- **Bug:** Skills section is `mb-6` but the 2-column grid below it is *not* the last section — `<ExtraSections variant="elegant" />` renders below it. If the grid puts Education and Certifications side-by-side with very different heights, ExtraSections starts on the *taller* column's bottom edge, leaving a visible vertical gap on the shorter side. Cosmetic but jarring.

### Healthcare (HealthcareTemplate.tsx)

- **Layout:** Teal header band, **certifications above experience**, certifications in a 2-column grid.
- **ATS verdict:** ⚠ Visual order (Cert → Exp) inverts the text-layer's canonical order (Exp → Cert from `extractResumeText`). Modern ATS reads the text layer and is fine; older parsers that score by position give wrong section weights.
- **Bug:** Header uses inline `style={{ backgroundColor: tealColor }}` — fine. But `<span className="w-1 h-4 rounded" style={{ backgroundColor: tealColor }} />` decorative bar inside each H2 (line 25, 33, 48, 77, 96) — that's 5 1-pixel-wide elements that html2canvas occasionally renders at sub-pixel widths and they vanish in the PDF. Cosmetic.

### Academic (AcademicTemplate.tsx)

- **Layout:** Serif single-column, navy headings, "Research Interests" / "Areas of Expertise" / "Certifications & Awards".
- **ATS verdict:** ✅ for academic submissions. Skills as coloured pills (line 76) — text layer fixes this.
- **Bug:** Hardcoded `w-[612px]` width fights A4. `text-justify` on summary (line 24) and on description (line 56) — html2canvas does not render `text-align: justify` consistently across browsers; some leave normal left-alignment. Visual inconsistency.

### Cyber (CyberTemplate.tsx)

- **Layout:** Mono font, red accent, **3-column grid for skills**, "Operations Log" / "Security Toolkit" / "Security Profile" / "Credentials" headings.
- **ATS verdict:** ❌ — Custom heading words ("Operations Log", "Credentials") will not match keyword filters in most ATS that rely on heading-word recognition. The hidden text layer prints canonical names but parsers that use OCR on the image (a small but real fraction) see only "Operations Log".
- **Bug:** The 3-column skill grid renders each skill in a bordered red box. With 12+ skills it produces 4+ rows; if the template hits a page break inside the grid, the snapper has no `data-break-child` markers on the cells, so the grid is treated as one tall `data-break-avoid` block and pushed to the next page (often leaving a half-page of white above).

### DevOps (DevOpsTemplate.tsx)

- Same pattern and concerns as Cyber (orange accent, 3-column skill grid). Verify whether it uses canonical or domain-specific headings — **likely ❌** based on the variant table in `ExtraSections.tsx:82-83`.

### DataScience (DataScienceTemplate.tsx)

- Same pattern as Cyber/DevOps (teal accent). Likely **⚠** depending on heading wording.

### Infographic (InfographicTemplate.tsx)

- **Layout:** Single column with a **gradient avatar circle** containing the user's first initial, decorative `border-l-2` timeline with violet dots beside each experience entry, gradient pill skills.
- **ATS verdict:** ❌ — `templateConfig.ts:35` declares `maxRecommendedPages: 1`, but no enforcement. If content exceeds one page, the user gets a 2-page PDF where the second page has no header (orphaned content). The gradient avatar is decorative-only (no real photo) but still a non-text element ATS will ignore — fine in itself.
- **Bug:** Decorative dots `<div className="absolute -left-[9px] top-1 w-4 h-4 bg-violet-500 rounded-full border-2 border-white" />` at line 32 sit *outside* the parent's content box (negative left position). When `prepareForCapture` sets parent overflow to `visible` this is fine; but `html2canvas` with `width: pageWidth` clips at the canvas edge — the leftmost dot is 9 px outside the source bounds and gets cropped to a half-circle in the PDF.
- **Bug:** The avatar circle gradient (`bg-gradient-to-br from-violet-500 to-pink-500`) renders as a flat solid in some browser versions of html2canvas — the user's initial may end up on a single-colour disc instead of the gradient seen in the editor.

### Portfolio (PortfolioTemplate.tsx)

- **Layout:** Single column with each experience entry inside a bordered card.
- **ATS verdict:** ⚠ — Heading "Projects & Experience" (line 39) is non-canonical. Worse, the template re-purposes the Experience array for what looks like a portfolio entry — but the underlying data is still job-shaped (position, company, dates, achievements). A reviewer expecting projects gets jobs.
- **Bug:** Each entry is wrapped in `border border-gray-200 rounded-lg p-3`. The border + padding adds vertical height the snapper does not anticipate; on a 2-page export the last entry on page 1 frequently has its bottom border clipped off (the `data-break-avoid` snap moves the entry to page 2, so the visual cut is the *previous* entry's bottom border). Cosmetic.

### Zen (ZenTemplate.tsx)

- Likely a centred minimalist single-column variant (per `ExtraSections.tsx:60-61` style). ⚠ Centre-aligned headings hurt copy-paste ATS but the text layer rescues automated parsers.

### Banking, Consulting, Product, Marketing, Startup

- All single-column variants of the same pattern with different accent colours and slightly different heading wording. ✅ ATS-friendly across the board.

### Legal

- Single column, formal serif. ✅.

---

## Suggested follow-up tasks

In priority order (P0 first):

1. **Make the text layer DOM-driven and pagination-aligned.** Walk `[data-section]` elements in DOM order, capture their text, distribute across pages using the same `smartBreaks` array as the image, and surface a real error (not a `console.warn`) if the layer fails. Add custom-section support.
2. **Tighten the truncation guard to 0.98 and add a one-step retry at scale 1.** Combined with a hard ceiling on `dynamicScale` for one-page mode (cap canvas area at 14 MP), this would close the silent-loss path.
3. **Solve mid-line slicing in oversized entries.** Either scan the captured canvas for whitespace bands when all snap tiers fail, or require every list item to carry `data-break-child` and forbid breaks inside non-marked text.
4. **Wire `data-pdf-force-layout` in `prepareForCapture` (or delete `print-safe.css`).** Today the file is dead.
5. **Photo-aware export.** Drop `loading="lazy"` from photo `<img>`s, set `crossOrigin="anonymous"`, and warn the user when the active template embeds a photo.
6. **Sales metric extraction guardrails.** Only render the metric card when the captured token is followed by `%`, `$`, `K`, `M`, `B`, or `+` AND followed by an outcome verb ("increased", "grew", "reduced", etc.) — otherwise render the bullet as plain text.
7. **Heading-word audit.** For each template, decide whether the visible heading should match the text-layer's canonical name, and either rename the template's headings or relabel `extractResumeText`'s headings per template.
8. **Pseudo-element capture check.** Verify the Executive `after:content-[',']` skill separator actually renders in the PDF on Chrome, Safari, Firefox; if not, switch to plain `, ` joined text.
9. **Decorative-dot clipping fix.** Add a small left-padding to InfographicTemplate so the timeline dots aren't outside the capture region.
10. **Federal template scope.** Either rename to "Government" or expand `ResumeData` with the fields a real federal résumé requires.

Each of these warrants its own remediation task plan in `.local/tasks/` following the AI / Auth / DB pattern, with the highest-priority three (#1, #2, #3) being the ones that materially change exported PDFs today.
