# Contributing to WiseResume

Welcome! This guide explains how to write tests, run coverage, and follow the project's conventions.

---

## Running Tests

```bash
# Run all tests once (fast, no coverage)
npm test

# Run in watch mode (reruns affected tests on file change)
npm run test:watch

# Run with coverage report (enforces 80% thresholds)
npm run test:coverage

# Run Vitest interactive UI in the browser
npm run test:ui
```

---

## Testing Standards

### Test File Locations

Tests live alongside their source files in `__tests__` subdirectories:

```
src/
├── components/
│   └── portfolio/
│       └── editor/
│           ├── MoreTab.tsx
│           └── __tests__/
│               └── MoreTab.test.tsx
├── hooks/
│   ├── usePublicPortfolio.ts
│   └── __tests__/
│       └── usePublicPortfolio.test.tsx
├── lib/
│   ├── urlUtils.ts
│   └── __tests__/
│       └── urlUtils.test.ts
└── pages/
    ├── PublicPortfolioPage.tsx
    └── __tests__/
        └── PublicPortfolioPage.test.tsx
```

### Coverage Thresholds

The project enforces **80% minimum** across all four coverage metrics:

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 80% |
| Statements | 80% |

Tests below this threshold will cause `npm run test:coverage` to exit with a non-zero code and fail CI.

---

## Global Mocks

All global mocks are registered in `src/test/setup.ts` and apply to every test file automatically. You do **not** need to import or re-declare these in individual test files.

| Module | Mock File | What It Mocks |
|--------|-----------|---------------|
| `framer-motion` | `src/test/mocks/framer-motion.tsx` | All motion components & hooks |
| `sonner` | `src/test/mocks/sonner.tsx` | Toast notifications |
| `@/lib/haptics` | `src/test/mocks/haptics.ts` | Haptic feedback |
| `@/lib/lazyWithRetry` | `src/test/setup.ts` (inline) | `React.lazy()` passthrough |
| `@supabase/supabase-js` | `src/test/mocks/supabase.ts` | Supabase client |
| `window.matchMedia` | `src/test/setup.ts` (inline) | Browser media queries |
| `window.scrollIntoView` | `src/test/setup.ts` (inline) | Scroll behavior |
| `ResizeObserver` | `src/test/setup.ts` (inline) | DOM resize events |

### Adding a New Global Mock

1. Create a file in `src/test/mocks/your-module.ts`
2. Use `vi.mock(...)` inside the file to register the mock
3. Import the file in `src/test/setup.ts`

---

## Writing Component Tests

Wrap components with required providers using the `wrapper` pattern:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MyComponent from '../MyComponent';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/my-route']}>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </MemoryRouter>
);

describe('MyComponent', () => {
  it('renders correctly', async () => {
    render(<MyComponent />, { wrapper });
    expect(await screen.findByText('Expected Text')).toBeDefined();
  });
});
```

---

## Writing Hook Tests

Use `renderHook` from `@testing-library/react`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyHook } from '../useMyHook';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMyHook', () => {
  it('returns expected data', async () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });
});
```

---

## Mock Data

Reusable mock entities live in `src/test/mocks/data.ts`. Import from there instead of creating one-off data in test files:

```ts
import { mockProfile, mockResumes } from '@/test/mocks/data';
```

---

## CI

Tests run automatically on every pull request via GitHub Actions (`.github/workflows/test.yml`). Pull requests with failing tests **cannot be merged**.

To see if your changes pass CI before pushing:

```bash
npm run test:coverage
```
