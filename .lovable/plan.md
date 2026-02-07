

# Add File Type Selection Before Upload

## Overview

Create a mobile-friendly bottom sheet that appears when the user wants to upload a resume, letting them choose between three file types: PDF, Word Document, or Photo/Image. After selection, the native file picker will only show files of that specific type.

---

## User Flow

```text
User taps Upload Zone
        ↓
  File Type Sheet appears
  ┌────────────────────────┐
  │  Choose file type      │
  │                        │
  │  [PDF icon]  PDF       │
  │  Best for text-based   │
  │                        │
  │  [Word icon] Word Doc  │
  │  .doc, .docx files     │
  │                        │
  │  [Image icon] Photo    │
  │  JPG, PNG images       │
  └────────────────────────┘
        ↓
  User taps an option
        ↓
  Native file picker opens
  (filtered to selected type)
        ↓
  File selected → Processing begins
```

---

## Implementation Details

### New Component: `FileTypeSelector.tsx`

Create a new bottom sheet component in `src/components/upload/FileTypeSelector.tsx`

**Props:**
```typescript
interface FileTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: 'pdf' | 'word' | 'image') => void;
}
```

**Features:**
- Bottom sheet using existing `Sheet` component
- Three large, touch-friendly option cards (min 72px height)
- Each card shows:
  - Icon (FileText for PDF, File for Word, Image for Photo)
  - Title (PDF Document, Word Document, Photo/Image)
  - Subtitle explaining accepted formats
- Cards have `active:scale-[0.98]` for touch feedback
- Selecting an option calls `onSelectType` and closes the sheet

**Visual Design:**
```text
┌─────────────────────────────────────┐
│            [drag handle]            │
│                                     │
│   📤 What type of file?             │
│   Select your resume format         │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  📄  PDF Document           │   │
│   │      Best for text-based    │   │
│   │      resumes (.pdf)         │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  📝  Word Document          │   │
│   │      Microsoft Word files   │   │
│   │      (.doc, .docx)          │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  🖼️  Photo / Image          │   │
│   │      Scanned or photo       │   │
│   │      resumes (.jpg, .png)   │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

### Update UploadPage.tsx

**Changes:**

1. **Add state for file type selector:**
   ```typescript
   const [showFileTypeSelector, setShowFileTypeSelector] = useState(false);
   const [selectedFileType, setSelectedFileType] = useState<'pdf' | 'word' | 'image' | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   ```

2. **Update upload zone click handler:**
   - Instead of opening file picker directly, show the FileTypeSelector sheet
   - Remove the invisible file input from the upload zone
   - Add a hidden file input with a ref

3. **Handle file type selection:**
   ```typescript
   const handleFileTypeSelect = (type: 'pdf' | 'word' | 'image') => {
     setSelectedFileType(type);
     setShowFileTypeSelector(false);
     
     // Update file input accept attribute and trigger click
     if (fileInputRef.current) {
       fileInputRef.current.accept = getAcceptString(type);
       fileInputRef.current.click();
     }
   };
   
   function getAcceptString(type: 'pdf' | 'word' | 'image'): string {
     switch (type) {
       case 'pdf': return '.pdf,application/pdf';
       case 'word': return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
       case 'image': return '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
     }
   }
   ```

4. **Update handleFile to process different file types:**
   ```typescript
   const handleFile = async (file: File) => {
     const fileType = getFileType(file);
     
     if (fileType === 'pdf') {
       // Existing PDF parsing logic
     } else if (fileType === 'word') {
       // Convert Word to text using mammoth.js or send to AI
       await handleWordFile(file);
     } else if (fileType === 'image') {
       // Use OCR directly on the image
       await handleImageFile(file);
     }
   };
   ```

5. **Make upload zone clickable:**
   ```typescript
   <motion.div
     className="... cursor-pointer"
     onClick={() => !isProcessing && setShowFileTypeSelector(true)}
     // Remove file input from inside
   >
   ```

---

### Word Document Parsing

**Option A: Client-side with mammoth.js**
- Add `mammoth` package to dependencies
- Extract text from Word documents locally
- Send extracted text to AI for parsing

**Option B: Server-side in Edge Function**
- Send the file to a new edge function
- Use Gemini's document understanding capabilities
- More reliable but requires file upload

**Recommended: Option A** (simpler, no file upload needed)

```typescript
import mammoth from 'mammoth';

async function handleWordFile(file: File): Promise<void> {
  setIsProcessing(true);
  setParseStep('reading');
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;
    
    if (!text.trim()) {
      setErrorType('NO_TEXT');
      setShowErrorRecovery(true);
      return;
    }
    
    setParseStep('analyzing');
    // Use existing AI parsing
    const resumeData = await parseTextWithAI(text);
    
    setPendingResumeData(resumeData);
    setShowImportReview(true);
  } catch (error) {
    setErrorType('CORRUPTED');
    setShowErrorRecovery(true);
  } finally {
    setIsProcessing(false);
  }
}
```

---

### Image/Photo Parsing

For images, use the existing OCR infrastructure:

```typescript
async function handleImageFile(file: File): Promise<void> {
  setIsProcessing(true);
  setParseStep('reading');
  
  try {
    // Convert image to canvas and run OCR
    const text = await extractTextFromImage(file, (progress) => {
      setOcrProgress({ page: 1, total: 1, status: progress.status });
    });
    
    if (!text.trim()) {
      setErrorType('NO_TEXT');
      setShowErrorRecovery(true);
      return;
    }
    
    setParseStep('analyzing');
    const resumeData = await parseTextWithAI(text);
    
    setPendingResumeData(resumeData);
    setShowImportReview(true);
  } catch (error) {
    setErrorType('UNKNOWN');
    setShowErrorRecovery(true);
  } finally {
    setIsProcessing(false);
  }
}
```

**New function in `src/lib/pdf/ocrExtractor.ts`:**
```typescript
export async function extractTextFromImage(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<string> {
  // Load image into canvas
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  
  // Run Tesseract OCR
  const imageData = canvas.toDataURL('image/png');
  // ... existing OCR logic
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/upload/FileTypeSelector.tsx` | Create | New bottom sheet for file type selection |
| `src/pages/UploadPage.tsx` | Modify | Add file type selector, update file handling |
| `src/lib/pdf/ocrExtractor.ts` | Modify | Add image OCR extraction function |
| `package.json` | Modify | Add mammoth dependency for Word parsing |

---

## Dependency Addition

```json
{
  "mammoth": "^1.6.0"
}
```

---

## Mobile UX Considerations

1. **Touch-friendly cards**: Minimum 72px height with 16px padding
2. **Visual feedback**: `active:scale-[0.98]` on tap
3. **Clear icons**: Large 40x40px icons for each option
4. **Descriptive text**: Shows exact file extensions accepted
5. **Safe area padding**: Uses `pb-safe` for notch/home indicator
6. **Smooth animations**: Sheet slides up with spring animation

---

## Summary

This implementation:
1. Creates a file type selection sheet shown before upload
2. Filters native file picker to only show selected file types
3. Adds Word document parsing with mammoth.js
4. Extends OCR to work directly on images
5. Provides a clean, mobile-first user experience

