# Implementation Plan: Theme-Level Code Splitting

**Branch**: `011-theme-code-splitting` (merged into `fix/analysis-gaps`) | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/011-theme-code-splitting/spec.md`

## Summary

Implement theme-level code splitting in `PublicSections` to reduce initial JS payload by dynamically loading theme-specific portfolio section renderers on demand. This replaces the monolithic `PublicSections.tsx` file with dynamically imported, self-contained renderers, improving initial load speeds for visitors to public portfolios.

## Technical Context

**Language/Version**: TypeScript / React
**Primary Dependencies**: React (`lazy`, `Suspense`), Framer Motion
**Target Platform**: Web application (Frontend)
**Project Type**: Vite web application
**Performance Goals**: Reduce initial JavaScript chunk size of public portfolio page by at least 30%.
**Constraints**: Ensure zero visual regression for existing themes. Fallback gracefully for unknown themes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
- Enhances portfolio load performance, directly benefiting user experience and the project's value proposition.
- Component refactoring remains purely technical and shouldn't change UX/UI behavior (zero regressions).

## Project Structure

### Documentation (this feature)

```text
specs/011-theme-code-splitting/
├── plan.md              # This file
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
src/
└── components/
    └── portfolio/
        └── public/
            ├── themes/
            │   ├── DefaultThemeRenderer.tsx
            │   ├── DeveloperTerminalRenderer.tsx
            │   ├── BoldDarkRenderer.tsx
            │   ├── DefaultTheme.tsx (lazy loader config)
            │   └── index.ts
            └── PublicSections.tsx (refactored to coordinate dynamic loading)
```

**Structure Decision**: Extract theme-specific rendering logic from the monolithic `PublicSections.tsx` into dedicated functional components under `src/components/portfolio/public/themes/`. `PublicSections.tsx` will become a lightweight coordinator that uses `React.lazy()` to fetch the required theme on the fly.

## Implementation Strategy

1.  **Extract Theme Renderers**:
    *   Create a factory/interface for ThemeRenderers.
    *   Extract the `developer-terminal` styles and layout from `PublicSections.tsx` into `DeveloperTerminalRenderer.tsx`.
    *   Extract `bold-dark` into `BoldDarkRenderer.tsx`.
    *   Extract the remaining switch logic into `DefaultThemeRenderer.tsx`.
2.  **Implement Lazy Loading**:
    *   Use `React.lazy` to dynamically import the corresponding renderer based on `pStyle`.
    *   Add a `<Suspense>` boundary in `PublicSections.tsx` that renders a loading skeleton.
3.  **Coordinate Props**:
    *   Pass all necessary props (`profile`, `resume`, `allSkills`, etc.) through the lazy-loaded components.
4.  **Fallback & Verification**:
    *   Ensure an unknown `pStyle` falls back to `DefaultThemeRenderer.tsx`.
    *   Build the bundle and verify the chunk size reduction metrics.
