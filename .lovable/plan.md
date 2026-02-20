

# Fix Career Card Preview Size on Desktop

## Problem
The Career Card sheet opens as a full-width bottom panel. On desktop, this creates a massive empty area with a proportionally tiny card preview hugging the left side because the 1200x630 aspect ratio card scales down relative to the full viewport width but sits in an unconstrained container.

## Solution
Add a `max-w-2xl mx-auto` constraint to the preview wrapper so the card preview centers and displays at a comfortable size on desktop, while remaining full-width on mobile.

## Changes

### `src/components/portfolio/CareerCardSheet.tsx` (line 504)
- Change the preview wrapper div class from `w-full` to `w-full max-w-2xl mx-auto`
- This caps the preview at ~672px wide on desktop, making the card preview large and centered
- On mobile the max-width has no effect since the screen is narrower

### Same file -- sheet content area (line 499)
- Add `max-w-3xl mx-auto w-full` to the scrollable content div so the variant picker buttons and action buttons also center on desktop instead of stretching edge-to-edge

## Files modified
| File | Change |
|------|--------|
| `src/components/portfolio/CareerCardSheet.tsx` | 2 class changes |
