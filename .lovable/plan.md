

# Add OCR Fallback for Scanned/Image-Based PDFs

## Overview
When the standard PDF text extraction fails (no selectable text), we'll fall back to OCR using Tesseract.js to extract text from rendered page images. This enables parsing of scanned resumes and image-based PDFs, with clear warnings about accuracy and processing time.

---

## User Experience Flow

1. User uploads a PDF
2. Standard text extraction is attempted first (fast, accurate)
3. If no text is found, show a prompt:
   - "This appears to be a scanned PDF. Would you like to use OCR to extract text? This may take 30-60 seconds and accuracy may vary."
4. If user confirms, run OCR on each page
5. Show progress updates ("Processing page 1 of 3...")
6. Parse the OCR text and proceed to editor with a warning toast about potential accuracy issues

---

## Technical Implementation

### 1. Install Tesseract.js

Add the `tesseract.js` package which runs OCR entirely in the browser using WebAssembly:

```bash
npm install tesseract.js
```

---

### 2. Create OCR Extraction Module

**New file: `src/lib/pdf/ocrExtractor.ts`**

This module will:
- Render each PDF page to a canvas at high resolution (2x scale for better OCR)
- Pass the canvas image to Tesseract.js for text recognition
- Return combined text from all pages
- Support progress callbacks for UI updates

```typescript
// Key functionality:
export async function extractTextWithOCR(
  file: File,
  onProgress?: (page: number, total: number, status: string) => void
): Promise<string>
```

Implementation details:
- Use pdf.js to render pages to canvas (already have this dependency)
- Create a single Tesseract worker for all pages (reuse is faster than creating per page)
- Render at 2x device pixel ratio for better character recognition
- Join page texts with double newlines
- Terminate worker when done to free memory

---

### 3. Update Text Extractor

**File: `src/lib/pdf/textExtractor.ts`**

Modify the extraction flow to return metadata about extraction quality:

```typescript
export interface ExtractionResult {
  text: string;
  method: 'text' | 'ocr';
  pageCount: number;
  needsOCR: boolean;  // True if text extraction found nothing
}

export async function extractTextFromPDF(file: File): Promise<ExtractionResult> {
  // Try standard extraction first
  // If NO_TEXT would be thrown, instead return { needsOCR: true, ... }
  // This lets the UI offer OCR as a choice rather than immediate error
}
```

---

### 4. Update Main Parser Entry Point

**File: `src/lib/pdfParser.ts`**

Add an OCR-enabled parsing function:

```typescript
export async function parseResumePDFWithOCR(
  file: File,
  onProgress?: (page: number, total: number, status: string) => void
): Promise<ResumeData>
```

This will:
1. Call OCR extractor
2. Pass resulting text to existing `parseResumeText()` function
3. Return structured resume data

---

### 5. Update Upload Page UI

**File: `src/pages/UploadPage.tsx`**

Add state and UI for OCR fallback:

**New state:**
```typescript
const [showOCRPrompt, setShowOCRPrompt] = useState(false);
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [ocrProgress, setOcrProgress] = useState<{ page: number; total: number } | null>(null);
```

**Updated flow:**
1. When standard extraction catches `NO_TEXT` error:
   - Store the file in `pendingFile`
   - Show OCR prompt dialog (not a toast, a real modal/dialog)

2. OCR Prompt Dialog:
   - Title: "Scanned PDF Detected"
   - Message: "This PDF doesn't contain selectable text. We can try OCR (optical character recognition) to extract text from the images."
   - Warning: "OCR may take 30-60 seconds and results may not be 100% accurate."
   - Buttons: "Try OCR" | "Cancel"

3. During OCR:
   - Show progress: "Processing page 2 of 4..."
   - Spinner animation

4. After OCR:
   - If successful: Show warning toast "Extracted via OCR - please review for accuracy" and navigate to editor
   - If failed: Show error toast

---

### 6. Add OCR Progress UI Component

**New file: `src/components/upload/OCRPromptDialog.tsx`**

A dialog component for OCR confirmation and progress:

```tsx
interface OCRPromptDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress?: { page: number; total: number };
}
```

Features:
- Uses existing Dialog component from shadcn/ui
- Shows different content for prompt vs. processing states
- Progress bar or page counter during processing
- Cancel button disabled during processing

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `tesseract.js` dependency |
| `src/lib/pdf/ocrExtractor.ts` | Create | OCR extraction logic using Tesseract.js |
| `src/lib/pdf/textExtractor.ts` | Modify | Return `needsOCR` flag instead of throwing for image PDFs |
| `src/lib/pdfParser.ts` | Modify | Add `parseResumePDFWithOCR` function |
| `src/pages/UploadPage.tsx` | Modify | Add OCR prompt flow and progress UI |
| `src/components/upload/OCRPromptDialog.tsx` | Create | Dialog for OCR confirmation and progress |

---

## Edge Cases & Handling

1. **Very large PDFs (10+ pages)**: Show estimated time, allow cancellation
2. **Poor quality scans**: OCR may produce gibberish - the section parser will still attempt to extract what it can
3. **Mixed PDFs (some text, some images)**: Standard extraction runs first, only offer OCR if truly no text
4. **Browser memory**: Tesseract worker is terminated after use; canvas is disposed per page
5. **Network offline**: Tesseract.js loads language data on first use - will fail without network. Show appropriate error.

---

## Accuracy Warnings

After successful OCR extraction, the app will:
1. Show a persistent warning banner in the editor: "This resume was imported via OCR. Please review all sections for accuracy."
2. The success toast will indicate OCR was used
3. The extraction summary may show lower confidence indicators

---

## Testing Plan

1. Upload a text-based PDF → Should work normally (no OCR prompt)
2. Upload a scanned/image PDF → Should show OCR prompt
3. Confirm OCR → Should see page-by-page progress
4. Verify extracted content appears in editor (may have errors, but should have content)
5. Cancel during OCR prompt → Should return to upload page
6. Test with multi-page scanned PDF → Should process all pages

