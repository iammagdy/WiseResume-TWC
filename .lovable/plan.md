

# Fix iOS PDF Download (Toast Shows Success But File Not Saved)

## Problem

On iOS, tapping "Download" shows a success toast ("Resume downloaded!") but the file is never actually saved. The user can't find the PDF anywhere on their device.

**Root Cause**: The success toast at line 290 fires unconditionally after the download attempt, regardless of whether the file was actually saved. On iOS Safari:
- `window.open(url, '_blank')` with a blob URL just opens a blank tab or gets blocked by the popup blocker -- it does NOT trigger a download
- `window.open(dataUrl, '_blank')` with a base64 data URL shows raw PDF data in a tab but doesn't save a file
- `navigator.share()` is the ONLY reliable way to save/send a PDF on iOS, but if the user cancels the share sheet, the catch block falls back to `window.open` which silently fails

## Solution

### 1. Make `navigator.share` the primary (and only real) iOS download method
- Remove the broken `window.open` fallbacks for iOS
- If `navigator.share` is available, use it and only show success toast when it completes
- If share is cancelled by user, show an info toast explaining how to save
- If `navigator.share` is truly unavailable (very old iOS), create a temporary `<a>` tag with a data URL and `download` attribute as last resort

### 2. Move success toast inside confirmed-success paths
- Only show "Resume downloaded!" when we know the file was actually delivered
- Show contextual messages for cancellation or fallback scenarios

### 3. Add explicit "Save to Files" instructions for iOS fallback
- If share API isn't supported, guide the user to long-press and "Download Linked File"

## File Changes

### `src/pages/PreviewPage.tsx` (lines 250-291)

Replace the download logic with:

```typescript
const url = URL.createObjectURL(pdfBlob);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMobile = isIOS || /Android/i.test(navigator.userAgent);

let downloadSucceeded = false;

if (isIOS) {
  // iOS: navigator.share is the ONLY reliable download method
  try {
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName });
      downloadSucceeded = true;
    } else {
      // Fallback: open blob in new tab with instructions
      const newTab = window.open(url, '_blank');
      if (newTab) {
        toast.info('Tap the share icon in Safari, then "Save to Files"', { duration: 6000 });
      } else {
        // Popup blocked - use anchor download with data URL
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(pdfBlob);
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info('If the file did not save, tap and hold the download button, then "Download Linked File"', { duration: 6000 });
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      // User cancelled the share sheet
      toast.info('Download cancelled. Tap download again to save your PDF.');
    } else {
      toast.error('Could not save PDF. Try using the Share button instead.');
    }
  }
} else if (isMobile) {
  // Android: blob URLs work with window.open
  window.open(url, '_blank');
  downloadSucceeded = true;
} else {
  // Desktop: standard anchor download
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  downloadSucceeded = true;
}

if (downloadSucceeded) {
  const successMessages = { ... };
  toast.success(successMessages[type]);
}
```

Key differences from current code:
- Success toast only fires when download is confirmed (share completed or desktop link clicked)
- Share cancellation (`AbortError`) shows helpful info toast instead of broken fallback
- No more `window.open(dataUrl)` which shows garbage in a tab
- Clear user guidance when fallback paths are used

