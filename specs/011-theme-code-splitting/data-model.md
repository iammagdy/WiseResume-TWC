# Data Model: Theme Code Splitting

**Feature Branch**: `011-theme-code-splitting` (in `fix/analysis-gaps`) | **Date**: 2026-03-13

## Type definitions

**`ThemeRendererProps`**:
```typescript
export interface ThemeRendererProps {
  profile: PublicProfile;
  resume: PublicResume;
  pStyle: string;
  accentColor: string;
  isTwoCol: boolean;
  navSections: { id: string; label: string }[];
  highlights: any[];
  allSkills: string[];
  portfolioSummary?: string | null;
}
```

**`ThemeMap`**:
```typescript
import { LazyExoticComponent, ComponentType } from 'react';

export type ThemeMap = Record<string, LazyExoticComponent<ComponentType<ThemeRendererProps>>>;
```
