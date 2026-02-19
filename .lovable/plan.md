

# Fix Landing Page Inaccuracies and Mobile Truncation

## Issue 1: Incorrect Template Count

The landing page claims "12 polished designs" and "12 Templates" in multiple places, but the app actually has **30 templates**. This is misleading and undersells the product.

**Locations to fix (all in `src/pages/Index.tsx`):**
- Line 28: `'12 polished designs'` in the comparison strip
- Line 32: `'12 Templates'` in the bonus chips

**Also in `src/components/landing/TemplateGallery.tsx`:**
- Line 333: `'See all 12 templates'` link text

All three will be updated to say **30** instead of 12.

---

## Issue 2: Comparison Strip Text Truncation on Mobile

The "Not Just Another Resume Builder" comparison rows use `truncate` on both the "them" and "us" text columns, which clips longer labels like "Live portfolio website" and "Real voice interview coach" on small screens.

**Root cause (lines 369-382 of `src/pages/Index.tsx`):**
- The row uses `flex items-center gap-3` with both sides set to `flex-1 min-w-0` and `truncate`, causing text to be cut off on narrow viewports.

**Fix:**
- Remove `truncate` from both text spans so text wraps naturally instead of being clipped.
- Use `text-[11px] leading-tight` to keep text compact while remaining fully readable.
- This ensures "PDF only" vs "Live portfolio website" and similar pairs are never cut off, even on 375px screens.

---

## Summary of File Changes

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Update "12" to "30" in comparisons and bonus chips; remove `truncate` from comparison row text |
| `src/components/landing/TemplateGallery.tsx` | Update "12" to "30" in "See all" link |
