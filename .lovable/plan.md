

# Fix Remaining Broken Logo Imports

## Problem
The build is failing because two files still import `wise-ai-logo.webp`, which was deleted during the logo restoration. Only `Index.tsx`, `AppIcon.tsx`, and `Footer.tsx` were updated -- these two were missed.

## Fix

### Update logo imports in two files

**File 1:** `src/components/applications/JobMatchScore.tsx`, line 10
- Change `import wiseAiLogo from '@/assets/wise-ai-logo.webp'` to `import wiseAiLogo from '@/assets/wise-ai-logo.png'`

**File 2:** `src/components/portfolio/qr/QRGeneratorSheet.tsx`, line 11
- Change `import wiseAiLogo from '@/assets/wise-ai-logo.webp'` to `import wiseAiLogo from '@/assets/wise-ai-logo.png'`

### Verify
After fixing, navigate to the landing page at 375px mobile and confirm:
- The original logo displays correctly in the hero, footer, and anywhere else it appears
- No build errors remain

