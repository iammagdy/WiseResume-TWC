# Implementation Plan: Portfolio Phase 3 – Low Portfolio Fixes

**Branch**: `008-portfolio-phase-3` | **Date**: 2026-03-13 | **Spec**: [spec.md](file:///m:/Repo/wiseresume-74945019/specs/008-portfolio-phase-3/spec.md)
**Input**: Feature specification for Portfolio UX polish and output quality.

## Summary

Polish UX and output quality for the Portfolio feature. This phase addresses:
- **PDF Export Fidelity**: Implementing a "print-safe" stylesheet to ensure readability and layout preservation in exports.
- **Content Rendering**: Ensuring the `portfolioSummary` field is correctly displayed on the public portfolio below the hero section.
- **Input Validation**: Automatically normalizing social media URLs by adding `https://` protocols where missing.
- **Design Preview Accuracy**: Isolating theme previews in the editor to prevent parent theme styles from bleeding into the preview.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 18 / Vite 5.4  
**Primary Dependencies**: html2canvas, pdf-lib, @tanstack/react-query, @supabase/supabase-js, Lucide React  
**Storage**: Supabase (PostgreSQL)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Web (Cross-browser compatibility for PDF export)
**Project Type**: Web application (Vite-based)  
**Performance Goals**: Accurate rendering of PDF exports across themes; zero broken visual artifacts in Print view.  
**Constraints**: Support for non-standard CSS (filters, color-mix) must be gracefully downgraded in PDF exports.  
**Scale/Scope**: Impacts PDF generation service and all public portfolio views.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Visual Quality**: Priority on high-fidelity output for user-facing exports (Aligned with quality standards).
- **Data Integrity**: Normalization of URLs prevents broken links (Aligned with reliability standards).
- **Architecture**: Maintaining isolated preview components (Aligned with modularity standards).

## Project Structure

### Documentation (this feature)

```text
specs/008-portfolio-phase-3/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (generated via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── portfolio/
│   │   ├── editor/
│   │   │   └── DesignTab.tsx    # Preview isolation target
│   │   └── public/              # Public rendering target
├── pages/
│   ├── PortfolioEditorPage.tsx   # Social link normalization target
│   └── PublicPortfolioPage.tsx    # PDF export & Summary rendering target
├── lib/
│   └── html2canvasRetry.ts        # PDF capture logic
# Implementation Plan: Portfolio Phase 3 – Low Portfolio Fixes

**Branch**: `008-portfolio-phase-3` | **Date**: 2026-03-13 | **Spec**: [spec.md](file:///m:/Repo/wiseresume-74945019/specs/008-portfolio-phase-3/spec.md)
**Input**: Feature specification for Portfolio UX polish and output quality.

## Summary

Polish UX and output quality for the Portfolio feature. This phase addresses:
- **PDF Export Fidelity**: Implementing a "print-safe" stylesheet to ensure readability and layout preservation in exports.
- **Content Rendering**: Ensuring the `portfolioSummary` field is correctly displayed on the public portfolio below the hero section.
- **Input Validation**: Automatically normalizing social media URLs by adding `https://` protocols where missing.
- **Design Preview Accuracy**: Isolating theme previews in the editor to prevent parent theme styles from bleeding into the preview.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 18 / Vite 5.4  
**Primary Dependencies**: html2canvas, pdf-lib, @tanstack/react-query, @supabase/supabase-js, Lucide React  
**Storage**: Supabase (PostgreSQL)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Web (Cross-browser compatibility for PDF export)
**Project Type**: Web application (Vite-based)  
**Performance Goals**: Accurate rendering of PDF exports across themes; zero broken visual artifacts in Print view.  
**Constraints**: Support for non-standard CSS (filters, color-mix) must be gracefully downgraded in PDF exports.  
**Scale/Scope**: Impacts PDF generation service and all public portfolio views.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Visual Quality**: Priority on high-fidelity output for user-facing exports (Aligned with quality standards).
- **Data Integrity**: Normalization of URLs prevents broken links (Aligned with reliability standards).
- **Architecture**: Maintaining isolated preview components (Aligned with modularity standards).

## Project Structure

### Documentation (this feature)

```text
specs/008-portfolio-phase-3/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (generated via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── portfolio/
│   │   ├── editor/
│   │   │   └── DesignTab.tsx    # Preview isolation target
│   │   └── public/              # Public rendering target
├── pages/
│   ├── PortfolioEditorPage.tsx   # Social link normalization target
│   └── PublicPortfolioPage.tsx    # PDF export & Summary rendering target
├── lib/
│   └── html2canvasRetry.ts        # PDF capture logic
└── styles/
    └── print-safe.css             # [NEW] Print-safe overrides
```

**Structure Decision**: Create a dedicated `print-safe.css` or use CSS modules for isolated print styles. Refactor `PublicPortfolioPage` to use a layout that accommodates the new Summary section.

## Verification Plan

### Automated Tests
- **Unit Tests**:
  - `src/lib/urlUtils.test.ts`: Verify `normalizeUrl` adds `https://` correctly.
  - `src/pages/PublicPortfolioPage.test.tsx`: Verify `portfolioSummary` is rendered in the correct position.
- **Run Command**:
  ```bash
  npm run test src/lib/urlUtils.test.ts
  ```

### Manual Verification
1.  **PDF Export Quality**:
    - Open a public portfolio with `neon-cyber` theme.
    - Generate PDF and check for "flattened" styles (no glowing text artifacts).
2.  **Portfolio Summary Visibility**:
    - Enter a summary in the editor, save, and check public page.
    - Ensure it appears before the "Experience" section.
3.  **Social Link Validation**:
    - Enter `twitter.com/user` in the editor.
    - Blur the field and confirm it becomes `https://twitter.com/user`.
    - Check the public link's responsiveness.
4.  **Theme Preview Isolation**:
    - Contrast a dark page theme with a light preview theme in the "Design" tab.
    - Verify no text color/shadow bleed from the page into the preview cards.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A        |            |                                     |
