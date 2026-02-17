

## Add Template Gallery Button to the Editor

### What You'll Get

A new "Template" button in the editor header that opens the existing template gallery sheet, letting you switch templates without leaving the editor. It will appear:

- **Desktop**: As a labeled icon button in the header toolbar (next to Design, Live Preview, and Wise AI)
- **Mobile**: As a new entry in the "Editor Tools" bottom sheet (under Quick Actions)

The button will use the `LayoutGrid` icon from Lucide and show the current template name as a subtle label.

### Technical Details

**File: `src/pages/EditorPage.tsx`** (3 small changes)

1. **Import**: Add `LayoutGrid` to the existing Lucide import line

2. **Desktop header** (~line 860-869): Add a "Template" button alongside the existing "Design" button, calling `handleChangeTemplate` which already exists and opens the `TemplateSelector` sheet

3. **Mobile tools panel** (~line 611-632): Add a "Change Template" action to the Quick Actions group in `editorToolGroups`, using the same `handleChangeTemplate` handler

No new components or files needed -- this wires up an existing sheet (`TemplateSelector`) that is already lazy-loaded and fully functional.

| Item | Detail |
|------|--------|
| Files changed | `EditorPage.tsx` only |
| New dependencies | None |
| Existing handler | `handleChangeTemplate` (line 556) already opens `TemplateSelector` |
| Risk | None -- purely additive UI wiring |

