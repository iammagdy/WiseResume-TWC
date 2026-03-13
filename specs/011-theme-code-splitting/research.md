# Research: Theme-Level Code Splitting

**Feature Branch**: `011-theme-code-splitting` (in `fix/analysis-gaps`) | **Date**: 2026-03-13

## Consolidate Findings

**Decision**: Use React.lazy with dynamic imports.
**Rationale**: Native React mechanism natively supported by Vite exactly for chunk generation. Reduces payload correctly out of the box.

**Decision**: Fallback mapping implementation to use `Record<string, LazyExoticComponent>`.
**Rationale**: Allows indexing by `pStyle` variable. Provides constant-time lookup. Fallbacks using optional chaining + default components works elegantly here.

**Alternative**: Use custom `import()` logic handling loading states manually without React.Suspense.
**Why rejected**: Suspense gives better concurrent mode and loading skeleton management naturally integrated via React components without needing manual `isPending` state handling.
