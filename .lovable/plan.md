

## Replace ResumeListCard Three-Dot Menu with ActionsPanel

### Overview

Swap the `DropdownMenu` kebab menu in `ResumeListCard` with the reusable `ActionsPanel` component (wrapping `FloatingPanel`). All existing handlers, props, and business logic remain identical -- only the menu container changes.

### What Changes

The three-dot menu (lines 312-430) is replaced by an `ActionsPanel` with the same trigger button and three action groups.

### Technical Details

**File: `src/components/dashboard/ResumeListCard.tsx`**

1. **Update imports** (lines 25-31): Remove `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger`. Add `import { ActionsPanel } from '@/components/ActionsPanel'` and the types `ActionsPanelGroup`.

2. **Remove `isMenuOpen` state** (line 74): No longer needed since ActionsPanel manages its own open state internally.

3. **Replace the menu block** (lines 312-430) with a single `<ActionsPanel>` using the three-dot button as the trigger and the following groups built via `useMemo`:

| Group | Title | Actions |
|-------|-------|---------|
| view-edit | View and Edit | Preview (Eye icon), Rename (Pencil, conditional on `onRename`), Edit (Edit2 icon) |
| actions | Actions | Download PDF (Download icon), Share (Share2 icon), Duplicate (Copy icon), Practice Interview (Mic, conditional on `onInterview`) |
| manage | Manage | Delete (Trash2 icon, variant: destructive) |

4. **Move handler logic into group builder**: Each action's `onClick` calls the exact same code currently inside each `DropdownMenuItem` (e.g., the async PDF download, clipboard share, navigate to preview, etc.). The `e.stopPropagation()` calls move to the trigger button only since ActionsPanel buttons don't bubble through the card. Haptic calls are handled by ActionsPanel automatically.

5. **Trigger element**: Same `Button variant="ghost" size="icon"` with `MoreVertical` icon, wrapped as the `trigger` prop. The `onClick` with `e.stopPropagation()` stays on this button to prevent card navigation.

### Action Mapping (handler preservation)

| Action | Handler (unchanged) |
|--------|-------------------|
| Preview | `navigateToEditor(\`/resume/${resume.id}\`)` |
| Rename | `setIsRenaming(true)` |
| Edit | `onEdit(resume.id)` |
| Download PDF | async import pdfGenerator + downloadUtils, same try/catch with toast |
| Share | `navigator.clipboard.writeText(...)` with toast |
| Duplicate | `onDuplicate(resume.id)` |
| Practice Interview | `onInterview(resume.id)` |
| Delete | `onDelete(resume.id)` with `haptics.warning()` |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/ResumeListCard.tsx` | Replace DropdownMenu with ActionsPanel, remove dropdown imports, add ActionsPanel import |

