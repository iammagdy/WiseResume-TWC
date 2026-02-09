

# Import Screen UI Redesign & Logic Enhancement Plan

## Overview

This plan addresses two objectives:
1. **UI Redesign**: Transform the current Upload Page to match the sleek megZone "Wise AI Engine" modal design
2. **Logic Enhancement**: Compare and adopt better import logic from the megZone architecture

---

## Comparison Analysis

### UI Comparison

| Aspect | Current WiseResume | megZone (Screenshot) | Verdict |
|--------|-------------------|---------------------|---------|
| **Layout** | Full page with separate header | Modal/dialog with close button | megZone is more elegant for mobile |
| **Branding** | No AI branding | "WISE AI ENGINE" badge at top | megZone adds trust |
| **Drop Zone** | Large circle icon, "Upload Your Resume" text | Clean bordered box with icon, description | megZone is cleaner |
| **Format Pills** | Bottom sheet selector (tap to choose type) | Inline pills below drop zone | megZone shows all options at once |
| **Privacy Note** | Tips section at bottom | "Privacy First" badge with shield | megZone builds trust better |
| **File Types** | PDF, Word, Image | PDF, DOCX, IMG (OCR), **JSON** | megZone adds JSON import |
| **Style** | Gradient icon, light theme | Dark theme, gradient border, purple accents | megZone is more modern |

### Logic Comparison

| Feature | Current WiseResume | megZone | Verdict |
|---------|-------------------|---------|---------|
| **JSON Import** | Not supported | Skips AI, direct schema validation | Add to WiseResume |
| **HTML Import** | Not supported | Mentioned in spec (.HTML, .HTM) | Add to WiseResume |
| **PDF Scanned Check** | Uses character count < 50 threshold | Uses character count < 50 threshold | Same |
| **OCR Fallback** | Tesseract.js (client-side) | Gemini Vision (cloud) | Both valid |
| **AI Parsing** | Edge function with tool calling | Gemini with responseSchema | Same approach |
| **File Size Limit** | 10MB | 2MB | WiseResume is more generous |
| **Review Flow** | ImportReviewSheet (select sections) | Split-pane with source preview | WiseResume is simpler for mobile |
| **Timeout** | No explicit timeout | 60s racing promise | Add timeout to WiseResume |
| **ID Regeneration** | Not mentioned | Post-parse UUID regeneration | Add to WiseResume |
| **System Prompt** | Already enhanced with FULL EXTRACTION | "Forensic Data Entry" persona | Already done |

---

## Proposed Changes

### 1. UI Redesign (High Priority)

Redesign the Upload Page to match the megZone modal aesthetic:

**New Layout Structure:**
```text
┌────────────────────────────────────┐
│ [WISE AI ENGINE]              [X]  │ ← Badge + close button
│                                    │
│ 📤 Import Resume                   │
│ Upload your existing CV and let    │
│ our AI parse, organize, and        │
│ optimize it for the editor.        │
│                                    │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │      Click to upload           │ │ ← Drop zone
│ │      or drag and drop          │ │
│ │                                │ │
│ │ .JSON, .PDF, .DOCX, .PNG, etc. │ │
│ └────────────────────────────────┘ │
│                                    │
│ [PDF] [DOCX] [IMG] [JSON]          │ ← Format pills
│  Auto   Word  OCR/  Direct         │
│ Parsing Docs Vision Data           │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ 🛡️ Privacy First               │ │ ← Trust badge
│ │ We parse your document         │ │
│ │ securely. No data is stored    │ │
│ │ permanently until you save.    │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**File:** Create new component `src/components/upload/ImportResumeSheet.tsx`
- Use Sheet component (bottom sheet on mobile)
- Add "WISE AI ENGINE" gradient badge
- Inline format pills instead of separate selector sheet
- Add dark glassmorphism styling
- Add "Privacy First" trust section
- Keep drag-and-drop functionality

**File:** Update `src/pages/UploadPage.tsx`
- Optionally make the upload accessible via sheet OR page
- Update styling to match dark gradient aesthetic
- Add JSON file type support

### 2. Add JSON Import (High Priority)

**Problem:** Users cannot import backup JSON files directly.

**Solution:** Add JSON file type that skips AI and validates directly.

**Files to modify:**
- `src/pages/UploadPage.tsx` - Add 'json' to FileType
- `src/components/upload/FileTypeSelector.tsx` - Add JSON option
- Create `src/lib/jsonResumeValidator.ts` - Validation logic

**Logic:**
```typescript
// When JSON file detected:
const handleJSONFile = async (file: File) => {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const validated = validateAndCleanResumeData(parsed);
  // Regenerate IDs to prevent React key conflicts
  const withNewIds = regenerateIds(validated);
  setPendingResumeData(withNewIds);
  setShowImportReview(true);
};
```

### 3. Add HTML Import (Medium Priority)

**Problem:** Some users export resumes as HTML from other tools.

**Solution:** Parse HTML and extract text for AI processing.

**Files to modify:**
- `src/pages/UploadPage.tsx` - Add 'html' file type
- Create handler using DOMParser to extract text content

### 4. Add Request Timeout (Medium Priority)

**Problem:** No timeout on AI parsing requests - could hang indefinitely.

**Solution:** Wrap API calls in Promise.race with 60s timeout.

**File:** `src/lib/pdfParser.ts`

```typescript
const PARSE_TIMEOUT = 60000; // 60 seconds

async function parseTextWithAI(text: string): Promise<ResumeData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PARSE_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    // ...
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 5. Add ID Regeneration (Low Priority)

**Problem:** Imported data might have duplicate IDs causing React list key issues.

**Solution:** Post-parse, regenerate all experience/education/certification IDs.

**File:** `src/lib/pdfParser.ts` or new utility

```typescript
function regenerateIds(data: ResumeData): ResumeData {
  return {
    ...data,
    experience: data.experience.map(exp => ({ ...exp, id: crypto.randomUUID() })),
    education: data.education.map(edu => ({ ...edu, id: crypto.randomUUID() })),
    certifications: data.certifications.map(cert => ({ ...cert, id: crypto.randomUUID() })),
  };
}
```

---

## Implementation Files

| File | Changes |
|------|---------|
| `src/components/upload/ImportResumeSheet.tsx` | NEW - Redesigned import UI as sheet |
| `src/pages/UploadPage.tsx` | Add JSON/HTML handlers, timeout, UI refresh |
| `src/components/upload/FileTypeSelector.tsx` | Add JSON option with icon |
| `src/lib/jsonResumeValidator.ts` | NEW - JSON import validation |
| `src/lib/pdfParser.ts` | Add timeout, ID regeneration |
| `src/types/resume.ts` | No changes needed |

---

## Summary of Enhancements

| Enhancement | Source | Benefit |
|-------------|--------|---------|
| JSON Import | megZone | Backup/restore without AI latency |
| HTML Import | megZone | Accept more file formats |
| Request Timeout | megZone | Prevent infinite hangs |
| ID Regeneration | megZone | Prevent React key conflicts |
| Format Pills UI | megZone Screenshot | Better discoverability |
| Privacy Badge | megZone Screenshot | Build user trust |
| AI Engine Branding | megZone Screenshot | Professional feel |

---

## What We're NOT Changing

The megZone specification also confirms WiseResume's architecture is already well-designed:

- Text extraction (pdf.js with Y-coordinate grouping) is excellent
- OCR fallback (Tesseract.js) works well for client-side processing
- FULL EXTRACTION directive already implemented
- ImportReviewSheet for section selection is better for mobile than split-pane

