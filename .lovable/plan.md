

# Fix and Enhance CV Parsing with AI Superpowers

This plan focuses on the highest-impact improvements that will meaningfully improve parsing accuracy without over-engineering. Changes are grouped into 5 implementation phases.

---

## Phase 1: Smart Text Preprocessing (client-side)

**File: `src/lib/pdf/textPreprocessor.ts` (new)**

Create a text cleaning module that runs between extraction and AI parsing:
- Fix concatenated words (e.g., "SoftwareEngineer" to "Software Engineer") using camelCase/PascalCase detection
- Normalize bullet characters (arrows, dashes, squares) to standard bullets
- Collapse repeated whitespace and fix broken line wraps
- Remove headers/footers (repeated text across page boundaries)
- Normalize date formats (detect and standardize "Jan 2024", "01/2024", "2024-01" etc.)
- Strip non-printable characters and fix encoding artifacts

**File: `src/lib/pdf/textExtractor.ts` (modify)**

Add a quality confidence score to `ExtractionResult`:
```text
interface ExtractionResult {
  text: string;
  method: 'text';
  pageCount: number;
  needsOCR: boolean;
  confidence: number;       // 0-1 score based on word density, formatting signals
  qualityIssues: string[];  // e.g. ["low word count", "possible multi-column"]
}
```

Compute confidence from: word count per page, character variety, presence of common resume keywords, ratio of printable vs garbage characters.

---

## Phase 2: Hybrid Extraction Strategy (client-side)

**File: `src/lib/pdf/textExtractor.ts` (modify)**

When layout-aware extraction produces low confidence (< 0.5):
1. Try raw `hasEOL`-based extraction (already exists as fallback but not scored)
2. Compare both results and pick the one with higher confidence
3. Only trigger OCR if both methods score below threshold

Add a new function `extractTextHybrid()` that runs both strategies and returns the best result. This prevents false OCR triggers for PDFs with unusual coordinate systems.

---

## Phase 3: AI-Powered Text Cleaning on the Edge Function

**File: `supabase/functions/parse-resume/index.ts` (modify)**

Add a preprocessing step before the main parse call:
- If the extracted text has quality issues (short, garbled, or low keyword density), run a lightweight AI call first to "clean and reconstruct" the text
- Use `gemini-2.5-flash-lite` for this fast preprocessing step (cheap and fast)
- This fixes OCR artifacts, concatenated words, and broken formatting before the main parse

Add text quality assessment:
```text
function assessTextQuality(text: string): { score: number; issues: string[] }
```

Checks: word count, email/phone presence, section keyword density, gibberish ratio, average word length.

---

## Phase 4: Multi-Pass Parsing with Confidence Scoring

**File: `supabase/functions/parse-resume/index.ts` (modify)**

After parsing, compute per-field confidence and retry low-confidence extractions:

1. Score each field: name (present + valid format), email (valid regex), phone, experience count, education count, skills count
2. If overall completeness < 40%, retry with a different prompt strategy:
   - Pass 1 (current): Full structured extraction
   - Pass 2 (fallback): Simpler prompt focusing only on missing fields
3. Merge results from both passes, preferring higher-confidence values

Add to the tool schema response:
```text
completeness: number;       // 0-100 overall score
fieldConfidence: {          // per-field 0-1 scores
  name: number;
  email: number;
  experience: number;
  // etc.
}
```

Return these in the response so the client can show quality indicators.

---

## Phase 5: Enhanced OCR Pipeline

**File: `src/lib/pdf/ocrExtractor.ts` (modify)**

Improve OCR quality:
- Add image preprocessing before OCR: convert to grayscale, increase contrast (using canvas `ImageData` manipulation)
- Apply adaptive thresholding for scanned documents with shadows/gradients
- After OCR, run the same text preprocessor from Phase 1 to clean results

**File: `src/lib/pdf/ocrExtractor.ts` (modify)**

Add per-page confidence from Tesseract:
- Tesseract returns word-level confidence scores
- Aggregate to page-level confidence
- If a page has very low confidence (< 30%), re-render at higher DPI (3x instead of 2x) and retry that page only

---

## Summary of Files Changed

| File | Action | Phase |
|------|--------|-------|
| `src/lib/pdf/textPreprocessor.ts` | New | 1 |
| `src/lib/pdf/textExtractor.ts` | Modify | 1, 2 |
| `src/lib/pdfParser.ts` | Modify | 1, 2 |
| `supabase/functions/parse-resume/index.ts` | Modify | 3, 4 |
| `src/lib/pdf/ocrExtractor.ts` | Modify | 5 |

---

## What is NOT included (and why)

- **CV format/template detection**: Adds complexity with marginal benefit since the AI model already handles format variety well
- **User feedback loop / A/B testing**: Requires analytics infrastructure beyond current scope
- **Streaming responses**: Current parse times are acceptable (under 30s for most CVs)
- **Parallel multi-page OCR**: Web Workers have memory constraints; sequential is more reliable
- **Manual correction UI for low-confidence fields**: The existing ImportReviewSheet already lets users toggle/review sections

---

## Technical Notes

- All text preprocessing runs client-side before sending to the edge function, reducing payload size
- The AI cleaning step on the edge function uses `gemini-2.5-flash-lite` (cheapest model) to keep costs low
- Confidence scoring is computed server-side and returned in the response for the client to display
- The hybrid extraction strategy adds ~100ms overhead but prevents unnecessary OCR (which takes 10-20s per page)
- All changes are backward-compatible; existing API contracts are preserved with additive fields only

