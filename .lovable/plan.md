
# Add "Save to Files" Button for iOS Users

## What Changes

On iOS devices, the bottom action bar on the Preview page will show a dedicated "Save to Files" button next to the main Download button. This gives iOS users a direct way to save their PDF without going through the full share sheet.

## How It Works

- Detect iOS using the existing user-agent check
- Show a "Save to Files" button (with a folder icon) only on iOS devices, next to the existing Download button
- Tapping "Save to Files" generates the PDF, then opens `navigator.share` pre-configured with just the file -- iOS will show the share sheet where "Save to Files" is a prominent option
- The main "Download" button continues to work as before (also uses `navigator.share` on iOS)

Since iOS Safari has no direct "save to filesystem" API, the best UX is to present `navigator.share` but with a clear label so users know to pick "Save to Files" from the share sheet. The toast will say "Choose 'Save to Files' from the menu" to guide them.

## Technical Details

### File: `src/pages/PreviewPage.tsx`

1. Add a new `handleSaveToFiles` function that:
   - Generates the PDF (reuses existing logic)
   - Creates a `File` object
   - Calls `navigator.share({ files: [file] })` 
   - Shows a guiding toast: "Choose 'Save to Files' from the menu"
   - Handles `AbortError` gracefully

2. Add an `isIOS` constant at the component level (move from inside `handleExport`)

3. In the bottom action bar, add a conditional button for iOS:
   ```
   [  Download (full width)  ] [ v ]
   [ Edit ] [ Save to Files ] [ Interview ] [ Share ]
   ```
   The "Save to Files" button replaces the Interview button's position on iOS only, keeping the layout clean. Actually, to avoid removing functionality, it will be added as an additional button in the second row.

### Layout adjustment (iOS only, second button row):
```
[ Edit ] [ Save to Files ] [ Interview ] [ Share ]
```
On non-iOS devices, the row stays as-is:
```
[ Edit ] [ Interview ] [ Share ]
```

### Icon
Use `FolderDown` from lucide-react for the "Save to Files" button to clearly convey saving to local storage.
