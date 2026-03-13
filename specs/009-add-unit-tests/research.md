# Research & Decisions: Add Unit Tests

## Testing Framework Selection

- **Decision**: Vitest + React Testing Library + jsdom
- **Rationale**: The repository already lists `vitest`, `@testing-library/react`, and `jsdom` in its `package.json` dependencies. Vitest is significantly faster than Jest, natively supports ESM and Vite configuration out of the box, and fits perfectly into the existing build ecosystem without requiring complex babel setups.
- **Alternatives considered**: Jest (requires more configuration and transformation logic for Vite), Mocha/Chai (outdated for modern React testing).

## External Dependency Mocking

- **Decision**: Mocking `supabase-js`, Kinde Auth, and global browser APIs (`window.matchMedia`) locally.
- **Rationale**: Testing external boundaries natively will violate the requirement to run fully offline and under 3 minutes.
- **Alternatives considered**: MSW (Mock Service Worker). While powerful, MSW introduces more boilerplate. Vitest's builtin `vi.mock()` is sufficient for mocking Supabase client methods directly.
