

## Improve Cover Letter PDF Styling

### Problem
The current cover letter PDF export is plain text with Helvetica font, no header/footer, no visual structure, and no professional formatting. It looks like raw text dumped onto a page.

### Solution
Create a dedicated `coverLetterPdfGenerator.ts` utility that produces a professionally styled, ATS-friendly PDF with:

- **Sender header block** showing the user's name, job title, and company prominently at the top
- **Professional typography**: Helvetica-Bold for headings, Helvetica for body, proper font sizing hierarchy
- **Structured layout**: Date line, recipient area, proper paragraph spacing with first-line or block-style formatting
- **Accent color bar** at the top of the page (thin colored line matching the app's brand or a professional blue)
- **Footer** with page numbers and subtle branding
- **Proper margins** (1-inch / 72pt) for print-readiness and ATS parsing
- **Paragraph-aware rendering**: Extra spacing between paragraphs (not just line breaks), proper handling of salutation/closing lines

### Files to Create

**`src/lib/coverLetterPdfGenerator.ts`** (new file)
- Accepts a `CoverLetterRecord` object
- Uses `pdf-lib` (already installed) with `StandardFonts` (Helvetica, Helvetica-Bold)
- Renders:
  1. Top accent bar (thin colored rectangle)
  2. Header: Letter title/job title in bold, company name below
  3. Date line (formatted from `created_at` or current date)
  4. Body paragraphs with proper spacing (double line-height between paragraphs)
  5. Footer with page number ("Page 1 of N" format)
- Exports a `generateCoverLetterPDF(letter: CoverLetterRecord): Promise<Uint8Array>` function
- Uses `downloadMobile`-compatible blob download pattern from existing `downloadUtils.ts`

### Files to Modify

**`src/pages/CoverLettersPage.tsx`**
- Replace the inline `handleDownload` function (lines 55-109) with a call to the new `generateCoverLetterPDF` utility

**`src/pages/CoverLetterEditPage.tsx`**
- Replace the inline `handleDownloadPDF` function (lines 81-127) with the same shared utility

### Technical Details

The PDF layout (all measurements in points, 72pt = 1 inch):

```text
+------------------------------------------+
| ======= accent bar (3pt tall) ========== |
|                                          |
|  [Bold] Cover Letter Title               |
|  [Regular] Company Name                  |
|                                          |
|  February 17, 2026                       |
|  ----------------------------------------|
|                                          |
|  Dear Hiring Manager,                    |
|                                          |
|  Body paragraph text with proper word    |
|  wrapping and 1.5x line height...        |
|                                          |
|  Second paragraph with extra spacing     |
|  between paragraphs (0.5x line gap)...   |
|                                          |
|  Sincerely,                              |
|  [Name]                                  |
|                                          |
|          --- Page 1 of 1 ---             |
+------------------------------------------+
```

- Font sizes: Title 16pt bold, company 11pt, date 10pt, body 11pt, footer 8pt
- Accent color: `#1e40af` (professional blue)
- Line height: 1.5x for body text
- Paragraph gap: additional 8pt between paragraphs
- ATS-friendly: uses standard fonts only, no images in body, selectable text
