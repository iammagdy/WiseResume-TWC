

## Fix PDF Download from Resume Detail Page and Redesign Toast Notifications

### Problem 1: PDF Download Fails

**Root cause**: The `handleDownload` in `ResumeDetailPage.tsx` calls `generatePDF(resumeData, templateId, null)` with `null` as the template element. The PDF generator then searches the DOM for `[data-resume-template]` but cannot find one because the detail page only renders a scaled-down `TemplateThumbnail` (which does not carry that attribute). The PreviewPage works because it renders a full-size template with a `ref` that gets passed to `generatePDF`.

**Fix**: Render a hidden, off-screen, full-size template on the detail page and pass its ref to `generatePDF`.

**File: `src/pages/ResumeDetailPage.tsx`**
- Add a `useRef<HTMLDivElement>(null)` for the hidden template container
- Render a hidden div (positioned off-screen with `position: fixed; left: -9999px; top: 0`) containing the full template at 612x792px with `data-resume-template` attribute
- Use the same lazy-loaded template component pattern from `TemplateThumbnail`
- Pass this ref to `generatePDF` as the third argument instead of `null`
- This approach avoids navigating away from the page and provides instant downloads

### Problem 2: Toast Notifications Look Bad

**Current state**: The CSS classes (`toast-premium`, `toast-success-accent`, etc.) exist in `index.css` but the visual result is poor -- the toast appears as a dark slab with minimal contrast, no clear visual hierarchy, and the close button is hard to see.

**Fix**: Redesign the toast CSS and Sonner configuration for a more polished, premium look.

**File: `src/index.css`** (toast section, lines 969-1119)
- Increase border radius and add a stronger left-side color accent bar (4px) instead of just a top border
- Improve background contrast with a slightly lighter card surface
- Add a subtle glow effect matching the toast type color
- Increase icon size from `h-4 w-4` to `h-5 w-5`
- Improve close button visibility
- Ensure the toast has proper padding and spacing for mobile readability

**File: `src/components/ui/sonner.tsx`**
- Update icon sizes from `h-4 w-4` to `h-5 w-5`
- Change toast position from `top-center` to `top-center` (keep) but add `offset` prop for safe area
- Update the `toast-premium` class to use a left accent bar pattern instead of top border
- Add `gap-3` to improve spacing between icon and text

### Files Summary

| File | Change |
|------|--------|
| `src/pages/ResumeDetailPage.tsx` | Add hidden off-screen template for PDF generation, pass ref to `generatePDF` |
| `src/index.css` | Redesign toast styles with left accent bar, better contrast, glow effects |
| `src/components/ui/sonner.tsx` | Update icon sizes, improve spacing and layout config |

### Implementation Order

1. `ResumeDetailPage.tsx` -- fix PDF download with hidden template
2. `src/index.css` -- redesign toast CSS
3. `src/components/ui/sonner.tsx` -- update Sonner config

### Technical Notes

- The hidden template uses `position: fixed; left: -9999px` so it is rendered in the DOM (required for html2canvas) but invisible to the user
- The template component is lazy-loaded using the same pattern as `TemplateThumbnail`
- Toast redesign uses a 4px left border accent instead of top border for a more modern notification style
- All toast type variants (success, error, warning, info) get matching left accent colors and subtle background tints
