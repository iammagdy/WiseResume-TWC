

# PDF Enhancement: Page Numbers + Combined Resume & Cover Letter Export

## Overview

Two powerful enhancements to the PDF export system:

1. **Visual Page Numbers** - Add elegant "Page X of Y" footers to each PDF page
2. **Combined Package Export** - Export tailored resume + cover letter as a single PDF

---

## Feature 1: Page Number Footers

### Visual Design

Each PDF page will have a subtle footer showing page information:

```
┌─────────────────────────────────────────┐
│                                         │
│         Resume content...               │
│                                         │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│           Page 1 of 3                   │  ← Centered footer
│                                         │
└─────────────────────────────────────────┘
```

### Implementation

Using `pdf-lib`'s native text drawing capabilities to add page numbers directly to the PDF (not via canvas capture):

```typescript
// After drawing the resume image, add page number text
import { rgb, StandardFonts } from 'pdf-lib';

// Embed a standard font
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

for (let pageNum = 0; pageNum < numPages; pageNum++) {
  const page = pdfDoc.getPage(pageNum);
  const pageText = `Page ${pageNum + 1} of ${numPages}`;
  const textWidth = font.widthOfTextAtSize(pageText, 9);
  
  // Draw centered at bottom with padding
  page.drawText(pageText, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y: 20, // 20pt from bottom
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5), // Gray color
  });
}
```

### Options

Add a toggle to enable/disable page numbers:

```typescript
interface PDFOptions {
  showPageNumbers?: boolean;
  pageNumberFormat?: 'simple' | 'full'; // "1" vs "Page 1 of 3"
}

export async function generatePDF(
  resume: ResumeData,
  templateId: TemplateId,
  templateElement?: HTMLElement | null,
  manualBreakSections?: string[],
  options?: PDFOptions // NEW
): Promise<Blob>
```

---

## Feature 2: Combined Resume + Cover Letter PDF Package

### User Flow

From the Preview page or after generating a cover letter:

```
┌─────────────────────────────────────────┐
│  Export Options                         │
├─────────────────────────────────────────┤
│                                         │
│  ◉ Resume only (PDF)                    │
│  ○ Cover letter only (PDF)              │
│  ○ Resume + Cover Letter (Combined PDF) │
│                                         │
│  Cover letter available: ✓              │
│  (From: Software Engineer @ Google)     │
│                                         │
│  [Download PDF]                         │
│                                         │
└─────────────────────────────────────────┘
```

### Combined PDF Structure

```
┌─────────────────────────────────────────┐
│          COVER LETTER                   │  ← Page 1: Cover letter (full page)
│                                         │
│  Dear Hiring Manager,                   │
│  ...                                    │
│  Sincerely,                             │
│  [Name]                                 │
│                                         │
│           Page 1 of 4                   │
├─────────────────────────────────────────┤
│          RESUME                         │  ← Pages 2-4: Resume pages
│                                         │
│  John Doe                               │
│  ...                                    │
│                                         │
│           Page 2 of 4                   │
└─────────────────────────────────────────┘
```

### Technical Implementation

Create a new function to generate the combined PDF:

```typescript
// src/lib/pdfGenerator.ts

export async function generateCombinedPDF(
  resume: ResumeData,
  templateId: TemplateId,
  coverLetter: string,
  templateElement?: HTMLElement | null,
  manualBreakSections?: string[]
): Promise<Blob> {
  // 1. Create the PDF document
  const pdfDoc = await PDFDocument.create();
  
  // 2. Add cover letter page(s) first
  await addCoverLetterPages(pdfDoc, coverLetter, resume.contactInfo);
  
  // 3. Generate resume pages and append
  await addResumePages(pdfDoc, resume, templateId, templateElement, manualBreakSections);
  
  // 4. Add page numbers to all pages
  await addPageNumbers(pdfDoc);
  
  // 5. Save and return
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer], { type: 'application/pdf' });
}

async function addCoverLetterPages(
  pdfDoc: PDFDocument, 
  coverLetter: string,
  contactInfo: ContactInfo
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  // Create first page
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  
  // Add header with contact info
  const headerY = PAGE_HEIGHT - 72; // 1 inch margin
  page.drawText(contactInfo.fullName, {
    x: 72,
    y: headerY,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  // Add date, greeting, body paragraphs with word wrapping
  // Handle multi-page cover letters if needed
  const lines = wrapText(coverLetter, font, 11, PAGE_WIDTH - 144);
  let y = headerY - 60;
  
  for (const line of lines) {
    if (y < 72) { // New page needed
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 72;
    }
    page.drawText(line, {
      x: 72,
      y,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 16; // Line height
  }
}
```

### State Management

Store the cover letter in the resume store for access from Preview page:

```typescript
// src/store/resumeStore.ts additions
interface ResumeState {
  // ... existing
  generatedCoverLetter: string | null;
  coverLetterJobContext: { title: string; company: string } | null;
  setGeneratedCoverLetter: (letter: string | null, context?: { title: string; company: string }) => void;
}
```

### Updated CoverLetterGenerator

Save the generated cover letter to state:

```typescript
// In CoverLetterGenerator.tsx
const { setGeneratedCoverLetter } = useResumeStore();

const handleGenerate = async () => {
  // ... existing generation code
  const letter = await generateCoverLetter(resume, jobDescription, tone);
  setCoverLetter(letter);
  // NEW: Save to store for combined export
  setGeneratedCoverLetter(letter, { title: jobTitle, company: jobCompany });
};
```

### New UI Components

**ExportOptionsSheet.tsx** - Export options dialog:

```tsx
interface ExportOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCoverLetter: boolean;
  coverLetterContext?: { title: string; company: string };
  onExport: (type: 'resume' | 'cover-letter' | 'combined') => void;
  isExporting: boolean;
}
```

**PreviewPage Updates**:
- Add "Export Options" button alongside Download
- Show combined export option when cover letter is available
- Update download handler to support all export types

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/pdfGenerator.ts` | Modify | Add page numbers, create combined PDF function |
| `src/store/resumeStore.ts` | Modify | Add cover letter state |
| `src/components/editor/ExportOptionsSheet.tsx` | Create | Export options dialog |
| `src/components/editor/tailor/CoverLetterGenerator.tsx` | Modify | Save cover letter to store |
| `src/pages/PreviewPage.tsx` | Modify | Integrate export options |
| `src/types/resume.ts` | Modify | Add PDFOptions interface |

---

## Technical Details

### pdf-lib Text Drawing

For cover letter pages, we'll use pdf-lib's native text capabilities:

```typescript
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';

// Word wrapping helper
function wrapText(
  text: string, 
  font: PDFFont, 
  fontSize: number, 
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
```

### Page Number Styling Options

```typescript
interface PageNumberStyle {
  format: 'simple' | 'full' | 'roman';
  position: 'center' | 'right' | 'left';
  fontSize: number;
  color: { r: number; g: number; b: number };
  marginBottom: number;
}

// Examples:
// simple: "1", "2", "3"
// full: "Page 1 of 3"
// roman: "i", "ii", "iii" (for cover letter), then "1", "2" for resume
```

---

## User Experience

### Preview Page Updated Actions

```
┌─────────────────────────────────────────┐
│  [Download PDF ▾]                       │  ← Dropdown with options
├─────────────────────────────────────────┤
│  ○ Resume Only                          │
│  ○ Resume + Cover Letter                │  ← Only if cover letter exists
│  ─────────────────                      │
│  ☑ Show page numbers                    │
└─────────────────────────────────────────┘
```

### Success Toast

```
┌─────────────────────────────────────────┐
│ ✓ Application Package Downloaded!       │
│   4-page PDF with cover letter + resume │
└─────────────────────────────────────────┘
```

---

## Edge Cases

1. **No cover letter generated** - Hide combined export option
2. **Very long cover letter** - Handle multi-page cover letters
3. **Special characters** - Ensure proper text encoding
4. **Paragraph breaks** - Parse `\n\n` as paragraph separators
5. **Page numbering across sections** - Continuous numbering or restart for resume

