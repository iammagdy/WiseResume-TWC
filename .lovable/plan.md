

# Fix: Eliminate Empty Gap Below Editor Content (Different Approach)

## Root Cause

The editor scroll container uses `flex-1` to fill all available vertical space. When the section content (e.g., Contact with 6 fields) is shorter than the container, the remaining space shows the container's `bg-card` background. This creates a visible gap because the `glass-card` on SectionCard uses `hsl(var(--card) / 0.5)` (semi-transparent), which looks different from the opaque `bg-card` underneath.

Previous fixes tried background color matching, but transparency still creates visual contrast.

## New Approach: Stretch Content + Opaque Cards

Two-part fix that eliminates the gap entirely:

1. **Stretch the content to fill the container** -- the section wrapper gets `min-h-full` so it always covers the full scroll area
2. **Make glass-card opaque inside the editor** -- a CSS override removes the transparency so the stretched card is visually identical to the container

## Technical Changes

### 1. `src/pages/EditorPage.tsx`

**Line 1215** -- Wrap `renderEditorContent()` in a div with `min-h-full flex flex-col`:

```jsx
<div
  className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-16 space-y-0 bg-card"
  ref={scrollContainerRef}
>
  <div className="min-h-full flex flex-col">
    {renderEditorContent()}
  </div>
</div>
```

**Lines 801, 808, 816, 824, 832, 840** -- Add `flex-1` to each section's wrapper div so the active section stretches to fill:

```jsx
// Before:
<div style={{ animation: 'spring-enter 0.35s ease-out' }}>

// After:
<div className="flex-1 flex flex-col" style={{ animation: 'spring-enter 0.35s ease-out' }}>
```

### 2. `src/components/editor/SectionCard.tsx`

**Line 19** -- Add back `flex-1` to the outer div so the card stretches within its wrapper:

```jsx
// Before:
'glass-card rounded-2xl overflow-hidden relative flex flex-col',

// After:
'glass-card rounded-2xl overflow-hidden relative flex flex-col flex-1',
```

### 3. `src/index.css`

Add a scoped CSS rule that makes `glass-card` fully opaque inside the editor scroll container. This eliminates the color contrast between the card and the container background:

```css
/* Editor: make glass-card opaque so stretched cards match container bg */
.editor-scroll-container .glass-card {
  background: hsl(var(--card));
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
```

## Why This Approach Works

- `min-h-full` on the inner wrapper ensures content is always at least as tall as the scroll container -- no empty gap visible
- `flex-1` on the section div and SectionCard makes the active section stretch to fill that full height
- The CSS override makes the card fully opaque in the editor context, so even if the card stretches beyond its natural content height, it looks seamless with the `bg-card` container
- Content taller than the container still scrolls normally (min-height doesn't cap max-height)
- The glass-card transparency is only removed inside the editor -- all other pages keep the original glass effect

## Files Changed

1. `src/pages/EditorPage.tsx` -- min-h-full wrapper + flex-1 on section divs
2. `src/components/editor/SectionCard.tsx` -- add flex-1 back
3. `src/index.css` -- scoped opaque override for editor glass-cards
