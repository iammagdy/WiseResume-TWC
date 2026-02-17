

## Optimize Editor Mobile Header: Surface Preview Toggle

### Problem
On mobile (<768px), toggling Live Preview requires opening the Tools Sheet first, then tapping "Live Preview" -- 2 taps for a frequent action. The Tools button is alone in the header's right side, leaving unused space.

### Solution
Surface the Preview toggle as a standalone button next to the Tools trigger in the mobile header, and remove the duplicate "Live Preview" entry from the Tools Sheet.

### Changes

**Modified: `src/pages/EditorPage.tsx`**

1. **Mobile header area (line ~829-886)**: Add a Preview toggle button before the Tools button inside the `flex md:hidden` container. It will use the same `Eye`/`PanelLeftClose` icon pattern as desktop but in a compact 48x48 touch target.

2. **Tools Sheet actions (line ~542-563)**: Remove the `preview` entry from the `quickActions` group in `editorToolGroups` since it's now directly accessible in the header. Also remove the `'preview'` entry from `toolMeta`.

### Technical Details

The new mobile header right side will look like:

```text
[ Eye/Preview toggle ] [ Sparkles/Tools ]
```

- The Preview button opens `LivePreviewSheet` on mobile (existing behavior at line 1062)
- Touch target: 48x48px with `active:scale-95` and haptic feedback
- Active state: `bg-primary/15 text-primary` when preview is open (matches desktop)
- The `toolMeta` cleanup removes the now-unused `'preview'` key

### Files Changed
- `src/pages/EditorPage.tsx` (2 edits: add button to mobile header, remove from tools sheet)

