
# Fix Template Gallery Mobile Clarity

## Problem Analysis
The template gallery thumbnails appear unclear and overlapping on mobile because:
1. The 60% container width on small screens (~225px on a 375px screen) scales the 612px template to ~0.37, making text illegible
2. The horizontal scroll carousel causes visual overlap between adjacent cards
3. There's no minimum size constraint for readability

## Solution

### Approach: Show one template at a time on mobile with larger thumbnails

Rather than showing multiple small, hard-to-read thumbnails, we'll:
1. Show a single centered card on mobile (wider width per card)
2. Add minimum width constraint for readability
3. Improve snap behavior so only one template shows at a time
4. Increase gap between cards to prevent visual overlap

### Changes

#### 1. Update TemplateGallery.tsx

**Card width adjustments:**
- Mobile: Change from `w-[60%]` to `w-[75%]` for larger, clearer thumbnails
- Ensure minimum width of 200px using `min-w-[200px]`
- Center the active card more prominently

**Scroll calculation fix:**
- Update `handleScroll` to use the new 75% width
- Update pagination dot click handler to match

**Visual improvements:**
- Add more horizontal padding to prevent edge clipping
- Increase gap between cards from `gap-4` to `gap-6`
- Reduce opacity difference for non-active cards to make the layout cleaner

#### 2. Update TemplateThumbnail.tsx

**Add resize observer:**
- Currently only calculates scale on mount
- Add a resize observer to recalculate scale when container size changes

**Set minimum scale:**
- Ensure text remains somewhat readable even at small sizes
- Add `min-scale` logic to prevent extreme shrinking

### Technical Implementation

```text
TemplateGallery.tsx changes:
+-------------------------------------+
| Before        | After               |
|---------------|---------------------|
| w-[60%]       | w-[75%] sm:w-[40%]  |
| gap-4         | gap-6               |
| px-6          | px-8                |
| opacity-60    | opacity-70          |
+-------------------------------------+
```

**TemplateThumbnail.tsx changes:**
- Add `ResizeObserver` to handle dynamic container width changes
- This ensures scale is correct when viewport changes

### Files to Modify
- `src/components/landing/TemplateGallery.tsx`
- `src/components/editor/TemplateThumbnail.tsx`
- `src/components/landing/LandingSkeletons.tsx` (update skeleton to match new widths)

### Expected Result
- Larger, more readable template previews on mobile
- Single focused card with clear visual hierarchy
- Smooth snap scrolling between templates
- Consistent appearance between skeleton and actual component
