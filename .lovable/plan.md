
# Fix: Editor Black Bar -- Definitive Solution (Attempt 4)

## Root Cause (The Real One This Time)

The previous fix added a CSS override to make glass-cards opaque inside the editor:

```css
.editor-scroll-container .glass-card {
  background: hsl(var(--card));  /* line 28 */
}
```

However, this is overridden by the **native-app rule** later in the file (line 448):

```css
body.native-app .glass-card {
  background: hsl(var(--card) / 0.92);  /* 92% opaque -- wins due to cascade order */
}
```

Since the native rule appears later and has equal specificity, the card remains semi-transparent on mobile. The `bg-card` container is fully opaque while the stretched card is 92% opaque, creating a visible color mismatch -- the "black bar" that keeps appearing.

The `flex-1` / `min-h-full` stretching from previous fixes adds complexity and makes the semi-transparent card stretch over the dark background, making the problem MORE visible, not less.

## Solution: Simplify Everything

**Remove all stretching hacks** and **fix the CSS specificity** so the override actually works:

1. Remove `flex-1` stretching from section wrappers (lines 801-840 in EditorPage.tsx) -- let cards size naturally to content
2. Remove `min-h-full flex flex-col` wrapper (line 1218) -- unnecessary
3. Remove `flex-1` from SectionCard (line 19) -- cards should not stretch
4. Fix the CSS override to use `!important` so it wins over the native-app rule

With proper color matching (no transparency), the area below the card and the card itself will be identical in color. No gap, no bar.

## Files Changed

### 1. `src/index.css` (line 28-31)
Add `!important` to the editor glass-card override so it beats the native-app rule:

```css
.editor-scroll-container .glass-card {
  background: hsl(var(--card)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
```

### 2. `src/pages/EditorPage.tsx`
- **Lines 801, 808, 816, 824, 832, 840**: Remove `className="flex-1 flex flex-col"` from each section wrapper div
- **Line 1218**: Remove the `min-h-full flex flex-col` wrapper div around `renderEditorContent()`

### 3. `src/components/editor/SectionCard.tsx`
- **Line 19**: Remove `flex-1` from the outer div class list

## Why This Works

- Cards size naturally to their content (no awkward stretching)
- The CSS `!important` ensures the card background is fully opaque inside the editor, matching the `bg-card` container exactly
- The space below the card is `bg-card`; the card itself is also `hsl(var(--card))` at 100% opacity -- identical colors, zero visual gap
- Works on both web and native-app contexts
