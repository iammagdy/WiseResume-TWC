
# Theme Store Implementation Plan

## Completed Steps

### Step 1: Theme Registry ✅
Created `src/lib/portfolioThemes.ts` with 9 theme configs.

### Step 2: Theme Picker UI ✅
Built theme selection UI in the portfolio editor.

### Step 3: Extend PublicPortfolioPage + Cards + CSS ✅
Wired theme registry into rendering — 5 new card styles, section headers, hero backgrounds, CSS animations.

### Step 4: Polish and Bug Fixes ✅
- Removed ~30 lines of dead rootStyle fallback code
- Fixed `--pf-bg-alpha` with proper `hexToRgba` helper
- Implemented `split` hero layout for Freelancer Starter theme
- Fixed hero social links/CTAs to respect `heroAlign` (left/split use `justify-start` on md+)
- Applied `pf-neon-scanline` overlay to Neon Cyber theme wrapper

## All steps complete 🎉
