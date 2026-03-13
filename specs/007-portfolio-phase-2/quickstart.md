# Quickstart: Portfolio Phase 2

## Setup
1. Ensure you are on the `007-portfolio-phase-2` branch.
2. Run `npm install` to ensure all dependencies (like Vitest) are ready.

## Local Development
Run the development server:
```bash
npm run dev
```
Navigate to:
- Editor: `http://localhost:5173/portfolio`
- Public View: `http://localhost:5173/p/[your-username]`

## Verification Steps

### 1. Stability Check (SSR/Capacitor)
To verify that environmental calls are guarded:
```bash
npm run test src/pages/PortfolioEditorPage.test.tsx
```
*(Note: You may need to create this test if it doesn't exist, specifically checking for window-undefined scenarios).*

### 2. Performance Check
Verify that `PublicPortfolioPage` is using code splitting. Check the network tab in browser dev tools:
- Initial load should NOT contain all theme variants.
- Navigation/scroll should trigger additional chunk loads for specific sections or themes.

### 3. Strength Score Logic
1. Open the Portfolio Editor.
2. Fill in all profile data but leave the portfolio **Unpublished**.
3. Verify that the "Strength Score" reaches 100% (or reflects only the data completeness).
4. Verify that a "Publish to make live" tip appears but doesn't lower the score.

### 4. Sticky Header
1. Open a public portfolio.
2. Scroll down until the sticky header appears.
3. Rapidly scroll or trigger data updates (if simulateable).
4. Verify there is no flicker or jump in the header's visibility.
