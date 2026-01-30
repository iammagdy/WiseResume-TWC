
## What’s actually happening (why it feels like a “fake” toast)
Right now the upload flow can genuinely “succeed” (PDF.js reads the PDF, no error is thrown), but the extracted text is basically one long line per page because we do:

- `textContent.items.map(item => item.str).join(' ')`

That destroys all line breaks and section structure (SUMMARY / EXPERIENCE / EDUCATION / SKILLS), so the regex-based section extraction almost always returns empty arrays/strings. Result: you land in `/editor` with an “empty” resume even though parsing technically ran.

So the toast isn’t fake — the parser is just producing almost no usable structured data.

---

## Goal
1) Make PDF text extraction preserve line breaks (and be usable even for 2+ pages).  
2) Make the upload success toast reflect real extraction results (and warn/fail when nothing meaningful was extracted).  
3) Improve section parsing so “EXPERIENCE / EDUCATION / SKILLS” actually populate.

---

## Implementation steps

### 1) Fix the PDF text extraction to keep lines (critical)
**File:** `src/lib/pdfParser.ts`

Replace the “join all items with spaces” approach with a layout-aware line reconstruction:

- For each text item we can read `transform[4]` (x) and `transform[5]` (y).
- Group items into “lines” by `y` (within a tolerance, e.g. rounding y to the nearest 2–4 units).
- For each line group:
  - Sort by x ascending
  - Join into a single line string
- Join lines with `\n`
- Join pages with `\n\n` to keep page separation

Also add a simple “two-column safety”:
- If a single y-line has two clusters far apart (big x-gap), split into two separate lines instead of joining into one (this prevents mixing sidebar + main column into one sentence).

**Result:** the extracted text contains real line breaks, and headings appear on their own lines like a normal resume.

---

### 2) Add “no selectable text” detection (scanned PDFs, image PDFs, protected PDFs)
**File:** `src/lib/pdfParser.ts`

After extracting text:
- If `fullText.trim().length < <threshold>` (ex: 50–100 chars), throw a specific error like:
  - `new Error("NO_TEXT_EXTRACTED")`

Also detect common PDF.js errors and map them:
- password-protected
- corrupted file

This allows the UI to show a helpful message instead of “try again”.

---

### 3) Improve section parsing to use line-based headings (not fragile regex-only)
**File:** `src/lib/pdfParser.ts`

Right now the parsing relies heavily on regex patterns that expect real `\n` boundaries and certain formatting.

Once we have real lines, we’ll improve `parseResumeText()` to:
- Pre-clean text:
  - normalize whitespace
  - normalize repeated blank lines to `\n\n`
- Build `lines[]` from the cleaned text
- Detect headings by scanning lines:
  - Summary: `summary|objective|profile|about`
  - Experience: `experience|work experience|employment|work history`
  - Education: `education|academic|qualifications`
  - Skills: `skills|technical skills|core competencies|technologies`
  - Certifications: `certifications|licenses|credentials`
- Extract section blocks by taking lines between headings.

Then parse each section:
- **Skills:** split by commas/bullets/pipes/newlines; filter out junk
- **Experience:** split into blocks by blank lines; for each block:
  - try to infer company/position from first 1–2 lines
  - parse date ranges if present
  - remaining lines become description / achievements
- **Education:** similar block-based parsing

This will populate far more reliably across 1–2 page resumes and common formats.

---

### 4) Stop showing “success” unless something was actually extracted
**File:** `src/pages/UploadPage.tsx`

Change the upload flow to:
- Parse the PDF → get `resumeData`
- Compute extraction summary:
  - `hasAnyContent = email || phone || fullName || skills.length || experience.length || education.length || summary.length`
- If `NO_TEXT_EXTRACTED` or `hasAnyContent` is false:
  - Show a clear error toast:
    - “We uploaded your PDF but couldn’t extract readable text. This usually happens with scanned/image PDFs.”
  - Do **not** navigate to `/editor`
- If extraction is partial:
  - Show a “warning-ish success” toast like:
    - “Imported resume: found email + 0 jobs + 2 skills. You may need to fill some sections manually.”
  - Navigate to `/editor`
- If extraction is good:
  - “Imported: 3 jobs, 12 skills, 2 education entries”

This removes the “fake success” feeling and makes it obvious what the system extracted.

---

### 5) (Optional but recommended) Add a small “Import result” banner in the Editor
**File:** `src/pages/EditorPage.tsx` (or a small component)

If the resume is missing key sections after import, show a non-blocking banner:
- “We couldn’t detect your Experience section. This can happen with heavily designed PDFs.”
- Suggest re-uploading a simpler PDF or manually adding entries.

This reduces confusion when some resumes don’t parse perfectly.

---

## How we’ll verify it works (end-to-end tests)
1) Upload a normal text-based PDF (2 pages):
   - Contact fields should populate (at least email/phone/name if present)
   - Skills list should get items
   - Experience should create entries (even if not perfect)
2) Upload a scanned/image PDF:
   - You should get a clear error message and stay on the upload page (no navigation to editor)
3) Upload a password-protected PDF:
   - You should get a specific message (“This PDF is password protected…”)

---

## Files that will be changed
- `src/lib/pdfParser.ts`
  - layout-aware extraction
  - scanned/password-protected detection
  - improved section parsing
- `src/pages/UploadPage.tsx`
  - only show success when extraction yields data
  - better error/warning messaging
  - prevent navigating to editor on “empty extraction”
- (Optional) `src/pages/EditorPage.tsx`
  - add an “import quality” banner if major sections are missing

---

## Notes / expectations
- For clean text-based PDFs, you should see meaningful auto-filled content.
- For heavily designed resumes (two columns, icons, canvases), extraction can still be imperfect, but the new line reconstruction + block parsing will be much better than the current “single-line” extraction.
- For scanned resumes, there is no real text to extract (we’ll educate the user and avoid misleading success states).
