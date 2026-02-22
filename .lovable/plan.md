
# Step 4: Polish and Bug Fixes

## Issues Found

### 1. Dead code in rootStyle (PublicPortfolioPage.tsx)
The `rootStyle` computation has a ~30-line ternary chain for `bold-dark`, `glass-pro`, `classic-clean`, and the default `minimal` case. But since ALL 9 themes are now in the registry, `themeConfig` is always truthy and the entire fallback chain is dead code. This should be cleaned up.

### 2. Broken `--pf-bg-alpha` computation
Line 386 tries to convert hex colors like `#0a0a14` to rgba using string replacement, but the logic only works for `rgb()` format — not hex. For hex-based themes (most of them), the result is a garbage string like `0a0a14` with no `rgba()` wrapper. This needs a proper hex-to-rgba helper.

### 3. Missing `split` hero layout (Freelancer Starter)
The `heroAlignClass` only handles `center` and `left`. The `split` layout (defined for Freelancer Starter) should show the avatar on the left and text/CTAs on the right in a side-by-side row on medium+ screens. Currently it falls through to `center`.

### 4. Hero social links and CTAs not respecting heroAlign
When `heroAlign` is `left`, the social links and CTA buttons still use `justify-center`. They should use `justify-start` for left-aligned themes.

### 5. Neon scanline overlay not applied
The CSS class `pf-neon-scanline` exists in index.css but is never applied to the Neon theme's page wrapper. It should be added as a subtle overlay on the Neon theme.

## Changes

### PublicPortfolioPage.tsx

**Clean up rootStyle**: Remove the dead ternary chain (lines 391-419). All themes are in the registry, so the `themeConfig` branch always runs. Add a proper `hexToRgba` helper for `--pf-bg-alpha`.

**Implement split hero**: When `heroAlign === 'split'`, change the hero to `md:flex-row md:items-center` with avatar in a left column and text/CTAs in a right column. On mobile, it stays stacked (single column).

**Fix hero alignment for left-aligned themes**: Update social links row and CTA row to use `heroAlignClass`-aware justification instead of hardcoded `justify-center`.

**Add neon scanline**: For `neon-cyber` theme, add the `pf-neon-scanline` pseudo-overlay to the portfolio wrapper.

### index.css
No changes needed -- existing CSS classes are complete.

### SectionHeader.tsx
No changes needed -- all 9 variants already work correctly.

### Card components
No changes needed -- all style cases are implemented.

## Technical Details

| File | Lines Changed | What |
|------|--------------|------|
| `src/pages/PublicPortfolioPage.tsx` | ~50 lines | Remove dead rootStyle fallbacks, fix bg-alpha, implement split hero, fix left-align justify, add neon scanline overlay |

The `hexToRgba` helper will reuse the existing `hexToRgb` function already in the file (line 44) and append an alpha value:

```text
function hexToRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex)}, ${alpha})`;
}
```

The split hero layout will restructure the hero content into a responsive grid:
- Mobile: normal stacked layout (unchanged)
- md+: two-column flex row with avatar on left, text+CTAs on right
