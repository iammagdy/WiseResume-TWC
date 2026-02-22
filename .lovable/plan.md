
# Fix Broken Landing Page — Missing Logo Import

## Problem
The landing page is showing a loading spinner and failing with a 500 error because `src/pages/Index.tsx` (line 4) still imports `wise-ai-logo.webp`, which was deleted in the previous logo restoration step. Only `AppIcon.tsx` and `Footer.tsx` were updated to use `.png` -- `Index.tsx` was missed.

## Fix

### 1. Update logo import in Index.tsx
**File:** `src/pages/Index.tsx`, line 4
- Change `import wiseAiLogo from '@/assets/wise-ai-logo.webp'` to `import wiseAiLogo from '@/assets/wise-ai-logo.png'`

That single line change will restore the landing page. Once it loads, I will scroll through the entire page at 375px width and check for horizontal overflow or text clipping.

### 2. Visual QA pass (after fix)
- Navigate to `/` at 375x812
- Scroll through every section: hero, comparison strip, demo cards, features, trust pillars, how-it-works, bottom CTA, footer
- Check for horizontal scrollbar, text clipping, and overflow issues
