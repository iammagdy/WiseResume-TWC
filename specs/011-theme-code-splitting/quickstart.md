# Quickstart: Testing Theme Code Splitting

**Feature Branch**: `011-theme-code-splitting` (in `fix/analysis-gaps`) | **Date**: 2026-03-13

## How to test dynamic chunks running locally

1. Open Developer Tools (Network Tab).
2. Filter for "JS".
3. Navigate to a public portfolio: `http://localhost:5173/p/username`.
4. Observe the initial chunks loaded.
5. In portfolio editor, change your theme to `bold-dark`.
6. Notice an additional chunk `BoldDarkRenderer.js` fetched over network containing only that theme's specific layout engine.

## Verifying Bundle Reduction

Run the Vite chunk builder:
```bash
npm run build
```

Observe the `dist/assets` output. You should see separate hashed js files for:
- `DeveloperTerminalRenderer-[hash].js`
- `BoldDarkRenderer-[hash].js`
- `DefaultThemeRenderer-[hash].js`
