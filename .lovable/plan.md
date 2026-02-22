

# Fix Black Bar in Editor - Make Content Fill Available Space

## Root Cause
The "black bar" is the dark `bg-background` showing through when a section's content is short (e.g., Contact with 3 fields). The scroll container has empty space between the last field and the bottom tab bar. Previous fixes (adding `pb-20` to AppShell, adjusting `pb-16`/`pb-24`) only shifted the gap around -- they never eliminated it because the content simply doesn't fill the available vertical space.

## Fix Strategy
Make the editor content stretch to fill the scroll container so there is no visible dark gap.

### 1. `src/pages/EditorPage.tsx` (line 1214) - Make scroll container a flex column
Add `flex flex-col` to the scroll container so its children can use `flex-1` to fill space:

- **Before**: `"editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-16 space-y-0"`
- **After**: `"editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-16 space-y-0 flex flex-col"`

### 2. `src/pages/EditorPage.tsx` (lines 799-804 and similar) - Make section wrappers fill height
Each section's animated `<div>` wrapper (e.g., Contact at line 800) should expand to fill available space. Wrap the `renderEditorContent()` output in a `flex-1` container, or add `flex-1` to each section's wrapper div.

The simplest approach: wrap the entire `renderEditorContent()` call in a `<div className="flex-1 flex flex-col">` so the content fills the scroll area.

### 3. `src/components/editor/SectionCard.tsx` - Allow card to stretch
Add `flex-1` to the SectionCard's outer `<div>` and its content `<div>` so the card fills the available height when its parent allows it. The card currently has a fixed layout; making it stretchy ensures no dark gap is visible below it.

Changes:
- Line 16: Add `flex-1` to the outer div className
- Line 52: Add `flex-1` to the content div className

## Technical Details

### `src/pages/EditorPage.tsx`
Around line 1213-1218, update the scroll container and add a flex-1 wrapper:

```tsx
<div
  className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-16 space-y-0 flex flex-col"
  ref={scrollContainerRef}
>
  <div className="flex-1 flex flex-col">
    {renderEditorContent()}
  </div>
</div>
```

### `src/pages/EditorPage.tsx` - `renderEditorContent`
Each section's wrapper div (lines 800, 807, 815, etc.) gets `className="flex-1 flex flex-col"` added alongside the existing animation style:

```tsx
<div className="flex-1 flex flex-col" style={{ animation: 'spring-enter 0.35s ease-out' }}>
```

### `src/components/editor/SectionCard.tsx`
- Line 16-17: Add `flex-1 flex flex-col` to the outer card div
- Line 52: Add `flex-1` to the content div so the children area expands

## Why This Works
- The scroll container becomes a flex column, allowing its children to expand
- Each section wrapper takes `flex-1`, filling the remaining space
- The SectionCard stretches vertically, so the card background fills the gap instead of showing `bg-background`
- On sections with long content, `flex-1` has no visible effect because the content already overflows -- scrolling works as before
- Desktop layout is unaffected since the desktop scroll container has a different class set

