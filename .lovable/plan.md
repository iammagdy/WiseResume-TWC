

## Native Mobile Sharing: Share Sheet with PDF and Link Options

### Overview

Upgrade the existing bare-bones share icon into a full "Share Resume" bottom sheet with multiple sharing options: share as PDF (via device native share sheet for email, WhatsApp, Messages, etc.), copy a shareable link, and share plain text. The existing `handleShare` function already generates a PDF and calls `navigator.share` -- this plan wraps it in a better UX with a dedicated sheet.

### What Already Exists

- `handleShare()` in PreviewPage generates a PDF blob and calls `navigator.share({ files: [file] })` directly
- `downloadFile()` utility handles cross-platform file operations including `navigator.share` on iOS
- A small Share2 icon button in the bottom action bar (line 560-567)
- `haptics` utility for tactile feedback

### Changes

**1. `src/components/editor/ShareSheet.tsx` -- New component**

A bottom sheet with three sharing options:

- **Share as PDF**: Generates PDF, opens device native share sheet (email, WhatsApp, AirDrop, Messages, etc.)
- **Share Link**: Copies the published app URL with resume ID as a parameter to clipboard (or shares via native share if available)
- **Share as Text**: Copies a plain-text version of the resume summary + contact info to clipboard for quick pasting

The sheet shows:
- A preview card with resume name and template
- Three action buttons, each with icon, title, and subtitle
- Loading state while PDF is generating
- Haptic feedback on actions

**2. `src/pages/PreviewPage.tsx` -- Wire up ShareSheet**

- Add `showShareSheet` state
- Change the Share2 icon button to open the sheet instead of calling `handleShare()` directly
- Also make the Share button show label text ("Share") like the other buttons
- Pass necessary props: resume data, template, resumeRef, generating state

**3. `src/lib/shareUtils.ts` -- New utility for share helpers**

- `shareAsPDF(blob, fileName)`: wraps `navigator.share` with file support detection and fallback
- `shareAsLink(resumeId)`: builds a shareable URL and uses `navigator.share({ url })` or copies to clipboard
- `shareAsText(resume)`: formats contact + summary as plain text and copies to clipboard
- `generateShareableUrl(resumeId)`: returns the published app URL with resume context

### Technical Details

**ShareSheet structure:**
```
Sheet (bottom, rounded-t-3xl)
  SheetHeader: "Share Resume"
  
  [Resume name + template badge]
  
  [Share as PDF] -- FileText icon
    "Opens your device's share menu"
    -> Generates PDF, calls navigator.share({ files: [file] })
    
  [Share Link] -- Link icon  
    "Copy link or share via apps"
    -> navigator.share({ url, title }) or navigator.clipboard.writeText()
    
  [Share as Text] -- Type icon
    "Copy resume summary to clipboard"
    -> navigator.clipboard.writeText(formatted text)
```

**PDF share flow:**
```typescript
const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
if (navigator.canShare?.({ files: [file] })) {
  await navigator.share({ files: [file], title: 'My Resume' });
} else {
  // Fallback: download the file
  await downloadFile({ blob: pdfBlob, fileName });
}
```

**Link sharing:**
```typescript
const url = `${window.location.origin}/preview?shared=${resumeId}`;
if (navigator.share) {
  await navigator.share({ title: 'My Resume', url });
} else {
  await navigator.clipboard.writeText(url);
  toast.success('Link copied to clipboard');
}
```

**Text sharing:**
```typescript
const text = [
  resume.contactInfo.fullName,
  resume.contactInfo.email,
  resume.contactInfo.phone,
  '',
  resume.summary,
].filter(Boolean).join('\n');
await navigator.clipboard.writeText(text);
```

### Files Modified
- `src/components/editor/ShareSheet.tsx` -- new: share options bottom sheet
- `src/lib/shareUtils.ts` -- new: share utility functions
- `src/pages/PreviewPage.tsx` -- wire up ShareSheet, update Share button to open sheet

