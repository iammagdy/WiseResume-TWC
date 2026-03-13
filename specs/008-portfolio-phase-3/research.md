# Research Findings: Portfolio Phase 3

## PDF Export Fidelity (Issue 9)
- **Problem**: PDF exports often have visual artifacts, missing icons, or broken layouts due to complex CSS (filters, color-mix) that `html2canvas` struggles with.
- **Findings**: `captureWithRetry` in `src/lib/html2canvasRetry.ts` accepts an `onclone` callback.
- **Solution**: 
  - Create `src/styles/print-safe.css` with simplified styles (solid colors, no filters, standard fonts).
  - In `PublicPortfolioPage.tsx`, pass an `onclone` callback to `captureWithRetry` that injects this CSS into the cloned document's head.
  - Apply a `data-pdf-force-layout` attribute to the container to trigger specific print-safe rules.

## Portfolio Summary Rendering (Issue 10)
- **Problem**: `portfolioSummary` is collected in the editor but not displayed.
- **Findings**: The field is already part of `portfolioExtras` in the database and fetched via `usePublicPortfolio`.
- **Solution**: 
  - Render a new section in `PublicPortfolioPage.tsx` right after the Hero section and before the `StatsStrip`.
  - Use a text-centric, clean design to distinguish it from the `portfolioBio` (which is typically longer and in its own section).

## Social Link Normalization (Issue 11)
- **Problem**: Users enter URLs like `linkedin.com/in/user` which prevents the `<a>` tag from working as intended (it's treated as a relative path).
- **Findings**: `PortfolioEditorPage.tsx` has individual state setters for `linkedinUrl`, `githubUrl`, etc.
- **Solution**: 
  - Implement a `normalizeUrl` helper that checks for `http://` or `https://`.
  - Trigger this normalization on the `onBlur` event of the input fields or within the `handleSave` function.

## Design Preview Isolation (Issue 12)
- **Problem**: "Design" tab previews are affected by the currently selected theme's global styles.
- **Findings**: `ThemeStorePicker.tsx` renders previews directly in the DOM without an iframe.
- **Solution**: 
  - Wrap the mini-preview content in a container with a `pf-preview-reset` class.
  - Define strict reset rules in CSS to ensure the previews always look consistent regardless of the active page theme.
  - Alternatively, use a Shadow Root if CSS scoping proves insufficient.
