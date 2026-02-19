
# Parsing & OCR Audit — Findings and Improvements

## What Was Audited

The full parsing pipeline was traced end-to-end across 6 files:

1. `src/lib/pdf/textExtractor.ts` — PDF text extraction (pdf.js)
2. `src/lib/pdf/ocrExtractor.ts` — Tesseract.js OCR for scanned PDFs and images
3. `src/lib/pdf/sectionParsers.ts` — Local regex fallback parser
4. `src/lib/pdfParser.ts` — Orchestrator / AI gateway
5. `supabase/functions/parse-resume/index.ts` — AI edge function (Gemini)
6. `src/pages/UploadPage.tsx` — UI flow and file routing

---

## Bugs and Gaps Found

### 1. OCR Canvas Render Mismatch (Critical Bug)
**File:** `src/lib/pdf/ocrExtractor.ts`, lines 104–118

The canvas is resized to a capped dimension (e.g. 1800×2400) but the PDF page is still rendered using the *original* `scale=2` viewport — not the scaled-down viewport. This means the PDF content is rendered at full 2× resolution but crammed into a smaller canvas, causing clipping of the right/bottom of every OCR page.

```typescript
// BUG: renders at full 2× viewport into a smaller canvas
canvas.width = canvasWidth; // e.g. 1800
canvas.height = canvasHeight; // e.g. 2048
await page.render({
  canvasContext: context,
  viewport: viewport, // still the 2× uncapped viewport — WRONG
}).promise;
```

**Fix:** When the canvas dimensions are capped, compute an adjusted viewport using the actual scale factor so the render matches the canvas size exactly.

---

### 2. `isProject` Flag Always Written as `false` (Data Loss Bug)
**File:** `supabase/functions/parse-resume/index.ts`, line 218

```typescript
isProject: exp.isProject || false,
```

The AI correctly sets `isProject: true` for project entries, but the double-check `|| false` short-circuits: if `exp.isProject` is `false`, the expression evaluates `false || false = false` — which is fine. But the problem is the schema tool definition at line 43 does not explicitly require `isProject` in the `required` array. When Gemini omits the field, `exp.isProject` becomes `undefined`, and `undefined || false = false`, so projects always get tagged as regular jobs and never surface in the Projects section.

**Fix:** Add `isProject` to the required fields in the tool schema, and add a rule to the system prompt clarifying when to set it.

---

### 3. Multi-language Name Regex Too Restrictive (International Resumes)
**File:** `supabase/functions/parse-resume/index.ts`, lines 190–194
**File:** `src/lib/pdf/sectionParsers.ts`, line 140

The name fallback regex is:
```
/^[A-Za-z\u00C0-\u024F\u0600-\u06FF\- ']+$/
```

This covers Latin extended and Arabic — but misses CJK (Chinese/Japanese/Korean: `\u4E00-\u9FFF`), Devanagari (Hindi: `\u0900-\u097F`), and Cyrillic (`\u0400-\u04FF`). Resumes from Indian, Russian, Korean or Chinese candidates will fail name detection and fall back to an empty string.

**Fix:** Expand the Unicode range in both the edge function and the local fallback parser to cover the full set of common script ranges.

---

### 4. `splitIntoBlocks` Misses Many Block-Start Triggers (Local Parser)
**File:** `src/lib/pdf/sectionParsers.ts`, lines 312–336

The regex that starts a new block only matches months `Jan/Feb/…` and `•►▪` bullets. But many real resumes use:
- Full month names (`January`, `February`)
- 4-digit years alone (`2019`, `2022`)
- Em-dashes and arrows (`→`, `▸`)
- Numbered list items (`1.`, `2.`)
- **BOLD ALL-CAPS lines** (common in many templates)

This causes experience entries from many PDF structures to merge into a single giant block, losing the company/position split.

**Fix:** Extend the block-start regex to include full month names, standalone years, additional bullet glyphs, and lines that are all-uppercase (≤ 5 words).

---

### 5. Skills Capped at 30 (Data Loss)
**File:** `src/lib/pdf/sectionParsers.ts`, line 273

```typescript
.slice(0, 30);
```

The local fallback parser silently truncates all skills beyond 30. Senior engineers with large tech stacks (often 40–60 skills) lose half their skills on fallback.

**Fix:** Raise the cap to 60 in the local parser. The AI path has no such cap.

---

### 6. OCR Text Quality Threshold Too Low
**File:** `src/lib/pdf/ocrExtractor.ts`, line 72

```typescript
if (cleanedText.length < 20) { throw new Error(...) }
```

A 20-character threshold will accept garbage OCR output (e.g. a page that only extracted `"jDHk mLOP vw"`) as successful. This means partially-readable scanned PDFs produce broken resume data with no warning.

**Fix:** Raise the minimum to 100 characters AND require at least 5 words (splitting on whitespace), which is a more robust signal of a real text extraction.

---

### 7. Word Document HTML Extraction Not Attempted
**File:** `src/pages/UploadPage.tsx`, line 343

`mammoth` is called with `extractRawText` only. Mammoth also supports `convertToHtml` which preserves bold/italic/list structure — especially important because DOCX files often use formatted bullets that `extractRawText` flattens into plain paragraphs, dropping bullet markers. Without bullet markers, the AI loses achievement/responsibility signals.

**Fix:** Try `convertToHtml` first, then strip tags but preserve structure markers (line breaks, list items), fall back to `extractRawText` only if HTML output is empty.

---

### 8. Missing `awards`, `publications`, `volunteering` from AI Schema
**File:** `supabase/functions/parse-resume/index.ts` (the entire tool schema)

The `parse_resume` tool schema only defines: `contactInfo`, `summary`, `experience`, `education`, `skills`, `certifications`. The AI is given no schema slot for `awards`, `publications`, `volunteering`, or `hobbies` — which are valid resume sections many users have. The edge function then returns those fields as absent, so `regenerateResumeIds` returns empty arrays for them regardless of what the resume actually contains.

**Fix:** Extend the tool schema and the system prompt to capture these 4 additional arrays. The `resumeData` mapping block must also be extended to include them.

---

## Files Changed

| File | Changes |
|---|---|
| `src/lib/pdf/ocrExtractor.ts` | Fix canvas viewport mismatch; raise OCR quality threshold to 100 chars + 5 words |
| `src/lib/pdf/sectionParsers.ts` | Extend block-start regex; raise skills cap to 60; expand name Unicode range |
| `src/pages/UploadPage.tsx` | Use mammoth `convertToHtml` first, fall back to `extractRawText` |
| `supabase/functions/parse-resume/index.ts` | Add `isProject` to required fields; extend schema with awards/publications/volunteering/hobbies; expand name Unicode; improve system prompt |

No database changes. No new dependencies. No new edge functions.
