

## Fix Color Palettes and Fonts Not Reflecting in CV Templates

### Problem

The Customize Sheet correctly saves `accentColor`, `fontHeading`, and `fontBody` to the resume's `customization` object, and `applyCustomizationCSS()` sets CSS variables like `--custom-accent` and `fontFamily` on the wrapper div. However, **none of the 29 templates read these values**. They all use hardcoded Tailwind classes (e.g., `text-purple-600`, `font-sans`) which override the customization.

### Solution

Rather than rewriting all 29 templates (risky and massive), we will:

1. **Inject a `<style>` tag** inside the resume wrapper in `LivePreviewPanel` that overrides template colors using CSS custom properties. This targets heading colors, border colors, and accent backgrounds using the `--custom-accent` variable.

2. **Force font inheritance** by adding `!important` font-family overrides in the same injected style block, so templates respect the user's font choices.

3. **Apply the same approach in the PDF generator** so downloaded PDFs also reflect the customization.

### Technical Details

**File 1: `src/lib/templateCustomization.ts`**
- Add a new function `generateCustomizationCSS(c: TemplateCustomization): string` that returns a CSS string with rules to override template accent colors and fonts. For example:
  - Target `[data-resume-template] h2` to apply accent color to section headings
  - Target `[data-resume-template] header` border colors
  - Target `[data-resume-template]` root for font-family
  - Use `!important` sparingly but necessarily to override hardcoded Tailwind classes

**File 2: `src/components/editor/LivePreviewPanel.tsx`**
- Import `generateCustomizationCSS` and inject a `<style>` element inside the resume wrapper div using the current resume's customization, so the preview reflects the selected colors and fonts in real time.

**File 3: `src/lib/pdfGenerator.ts`**
- Before capturing via html2canvas, inject the same customization CSS into the resume element so the PDF output also reflects the user's customization choices. Clean it up after capture.

### What Changes

| File | Change |
|------|--------|
| `src/lib/templateCustomization.ts` | Add `generateCustomizationCSS()` function |
| `src/components/editor/LivePreviewPanel.tsx` | Inject `<style>` tag with customization overrides inside resume wrapper |
| `src/lib/pdfGenerator.ts` | Inject customization CSS before html2canvas capture |

### What Does NOT Change

- The CustomizeSheet UI (already works correctly)
- The resume store (already persists customization)
- Individual template files (no changes needed)
- The `handleCustomizeApply` callback in EditorPage
