

## Persist Template Changes Immediately to Database

### Problem

When you pick a new template in the editor, it updates the local state but relies on a 3-second debounced auto-save to write it to the database. If you close the editor or navigate away quickly, the template change can be lost.

### Solution

Trigger an immediate database save right after a template is selected in the `TemplateSelector`, bypassing the 3-second debounce.

### Technical Details

**File: `src/components/editor/TemplateSelector.tsx`** (2 changes)

1. Accept a new optional `onTemplateApplied` callback prop
2. Call it after updating local state in `handleSelect`

**File: `src/pages/EditorPage.tsx`** (1 change)

1. Pass an `onTemplateApplied` callback to `TemplateSelector` that calls `saveToCloud()` immediately (the same function used by auto-save), skipping the 3-second debounce. Use a small `setTimeout(0)` to ensure the Zustand store has flushed first.

| Item | Detail |
|------|--------|
| Files changed | `TemplateSelector.tsx`, `EditorPage.tsx` |
| Mechanism | Immediate `saveToCloud()` call after template selection |
| Fallback | Debounced auto-save still runs as a safety net |
| Risk | None -- uses existing save logic, just triggers it sooner |

