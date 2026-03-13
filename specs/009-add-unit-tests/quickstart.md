# Quickstart: Unit Tests

## Running the Test Suite

1. **Local Watch Mode** (Recommended for development):
   ```bash
   npm run test:watch
   ```

2. **Run All Tests Once** (CI Mode):
   ```bash
   npm run test
   ```

3. **Generate Coverage Report**:
   ```bash
   npx vitest run --coverage
   ```
   *Note: Ensure you have initialized the `vitest` coverage provider in `vite.config.ts` if not already installed (e.g., `@vitest/coverage-v8`).*

## File Structure

- Tests are co-located next to the files they test (e.g., `src/lib/urlUtils.test.ts` next to `src/lib/urlUtils.ts`).
- Global mocks and repetitive setup items are placed in `src/test/setup.ts`.
