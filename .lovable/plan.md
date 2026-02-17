

## Refactor EditorPage: Mobile Tabs Layout

### Problem
On mobile, the editor uses a bottom-sheet drawer for preview, requiring users to dismiss it to return to editing. This is not ideal for frequent editor/preview toggling. The ResizablePanelGroup is desktop-only but the mobile fallback could be improved with a tab-based UI.

### Solution
Use `useIsMobile` to switch between two layouts:
- **Mobile**: A shadcn `Tabs` component with "Editor" and "Preview" tabs, rendering each full-width
- **Desktop**: Keep the existing `ResizablePanelGroup` split-screen behavior unchanged

### Changes

**Modified: `src/pages/EditorPage.tsx`**

1. **Import Tabs** (line ~1): Add `import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'`

2. **Add mobile tab state** (line ~157): Add `const [mobileEditorTab, setMobileEditorTab] = useState<'editor' | 'preview'>('editor')` for tracking active tab on mobile.

3. **Replace layout block** (lines 1008-1042): Replace the current conditional layout with:

```text
Desktop (isMobile === false):
  - If showPreview: ResizablePanelGroup (unchanged)
  - Else: single-column editor (unchanged)

Mobile (isMobile === true):
  <Tabs value={mobileEditorTab} onValueChange={setMobileEditorTab}>
    <TabsList className="w-full sticky top-0 z-10">
      <TabsTrigger value="editor" className="flex-1">Editor</TabsTrigger>
      <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
    </TabsList>
    <TabsContent value="editor">
      {renderEditorContent()}
    </TabsContent>
    <TabsContent value="preview">
      <LivePreviewPanel highlightSection={activeTab} />
    </TabsContent>
  </Tabs>
```

4. **Remove mobile Preview header button** (lines 827-838): The dedicated mobile Preview button in the header becomes unnecessary since the Tabs handle navigation. Remove it to declutter the header.

5. **Remove LivePreviewSheet on mobile** (line 1071): Remove `{showPreview && isMobile && <LivePreviewSheet ...>}` since preview is now inline via the Tabs.

6. **Float Proofread FAB above tab bar** (line 1052): Add `bottom-24` positioning class to ensure it clears the bottom navigation bar on mobile.

### Technical Details

- The `Tabs` component from shadcn uses Radix `TabsPrimitive` which is not a Popper-based component, so it won't cause the known infinite re-render issue.
- `LivePreviewPanel` is already lazy-loaded; wrapping it in `TabsContent` means it only renders when the "Preview" tab is active.
- The `TabsList` gets `sticky top-0 z-10` so it remains visible while scrolling editor content.
- Desktop behavior is completely unchanged -- the `isMobile` guard ensures the `ResizablePanelGroup` path is untouched.

### Files Changed
- `src/pages/EditorPage.tsx` (import addition, new state, layout refactor, cleanup of preview button and sheet)

