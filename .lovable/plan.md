
# Fix File Type Filtering + App Crash on Upload

## Problem Analysis

I identified **two distinct issues**:

### Issue 1: File Type Filter Not Working Properly
When user selects "PDF", the file picker still allows selecting photos or other files. This happens because:

1. **Mobile browsers ignore `accept` attribute** - On iOS and Android, the `accept` attribute on file inputs is often just a "hint" - browsers may still show all files or allow selecting files outside the filter
2. **Timing issue** - The `accept` attribute is set dynamically after the sheet closes, but some browsers cache the previous accept value when the input was initially rendered

### Issue 2: App Crashes/Restarts During Upload
The app restarts without completing the upload due to:

1. **Unhandled async errors** - The `handleInputChange` function calls `handleFile` without a try-catch, so any unhandled promise rejection crashes the app
2. **React ref warning** - Console shows "Function components cannot be given refs" for `FileTypeSelector`, indicating the Sheet's Dialog is trying to pass a ref to a non-forwardRef component

---

## Solution

### Fix 1: Validate File Type After Selection (Client-Side Enforcement)

Since mobile browsers don't reliably enforce the `accept` attribute, we need to validate the file type **after** the user selects a file:

```typescript
// Store the expected file type
const [expectedFileType, setExpectedFileType] = useState<FileType | null>(null);

const handleFileTypeSelect = (type: FileType) => {
  setExpectedFileType(type); // Remember what type user selected
  setShowFileTypeSelector(false);
  
  if (fileInputRef.current) {
    fileInputRef.current.accept = getAcceptString(type);
    setTimeout(() => fileInputRef.current?.click(), 50);
  }
};

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Reset input for next selection
  e.target.value = '';
  
  // Validate file matches expected type
  const actualType = getFileType(file);
  
  if (expectedFileType && actualType !== expectedFileType) {
    toast.error(`Please select a ${expectedFileType.toUpperCase()} file. You selected a ${actualType} file.`);
    return;
  }
  
  handleFile(file);
};
```

### Fix 2: Wrap All Handlers in Try-Catch

Prevent app crashes by adding comprehensive error handling:

```typescript
const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // Reset input value for re-selection
  e.target.value = '';
  
  try {
    // Validate file type
    const actualType = getFileType(file);
    if (expectedFileType && actualType !== expectedFileType && actualType !== 'unknown') {
      toast.error(`Please select a ${expectedFileType.toUpperCase()} file.`);
      return;
    }
    
    await handleFile(file);
  } catch (error) {
    console.error('Upload error:', error);
    toast.error('Something went wrong. Please try again.');
    setIsProcessing(false);
  }
}, [handleFile, expectedFileType]);
```

### Fix 3: Add forwardRef to FileTypeSelector

Fix the React warning by wrapping the component with forwardRef (even though we don't use the ref):

```typescript
import { forwardRef } from 'react';

export const FileTypeSelector = forwardRef<HTMLDivElement, FileTypeSelectorProps>(
  function FileTypeSelector({ open, onClose, onSelectType }, ref) {
    // ... existing implementation
  }
);
```

### Fix 4: Global Unhandled Rejection Handler

Add a safety net in App.tsx to catch any remaining unhandled promise rejections:

```typescript
useEffect(() => {
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled rejection:', event.reason);
    event.preventDefault();
  };
  
  window.addEventListener('unhandledrejection', handleRejection);
  return () => window.removeEventListener('unhandledrejection', handleRejection);
}, []);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/UploadPage.tsx` | Add `expectedFileType` state, validate file type in `handleInputChange`, wrap handlers in try-catch |
| `src/components/upload/FileTypeSelector.tsx` | Add `forwardRef` wrapper to fix React warning |
| `src/App.tsx` | Add global unhandled rejection handler as safety net |

---

## User Experience After Fix

1. User taps Upload Zone
2. File Type Selector sheet appears
3. User selects "PDF"
4. Native file picker opens (may still show all files on some devices)
5. **If user selects a photo instead of PDF**: Toast error "Please select a PDF file. You selected an image file."
6. **If user selects correct PDF**: Processing begins normally
7. **If any error occurs during processing**: Toast error instead of app crash

---

## Technical Summary

### Changes to `UploadPage.tsx`
- Add `expectedFileType` state to track user's selection
- Validate actual file type matches expected in `handleInputChange`
- Reset input value after each selection to allow re-selecting same file
- Wrap `handleFile` call in try-catch to prevent crashes

### Changes to `FileTypeSelector.tsx`
- Wrap component with `forwardRef` to eliminate React warning
- No functional changes needed

### Changes to `App.tsx`
- Add `unhandledrejection` event listener as global safety net
