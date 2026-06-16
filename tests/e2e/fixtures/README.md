# E2E Test Fixtures

Test data and seed scripts for WiseResume E2E testing.

## Public Portfolio Test Fixtures

Three portfolio fixtures are provided for testing the public portfolio features:

| Fixture | Username | Password | Use Case |
|---------|----------|----------|----------|
| Public | `testportfolio` | None | Basic public portfolio viewing |
| Protected | `testprotected` | `testpass123` | Password-protected access flow |
| Edge Case | `testedgecase` | None | Unusual/malformed data handling |

### Prerequisites

1. Copy `.env.test.example` to `.env.test` and fill in your Appwrite credentials:
   ```bash
   cp tests/e2e/fixtures/.env.test.example tests/e2e/fixtures/.env.test
   ```

2. Get a server API key from Appwrite Console:
   - Go to API Keys → Create API Key
   - Enable scopes: `databases.read`, `databases.write`
   - Copy the key to `APPWRITE_API_KEY` in `.env.test`

### Creating Fixtures

```bash
# Install tsx if not already installed
npm install -g tsx

# Create all test fixtures
npx tsx tests/e2e/fixtures/portfolio-test-fixtures.ts

# Clean up test fixtures
npx tsx tests/e2e/fixtures/portfolio-test-fixtures.ts cleanup
```

### Test URLs

After creating fixtures, these URLs should work:

- **Public Portfolio:** `https://wiseresume.app/p/testportfolio`
- **Protected Portfolio:** `https://wiseresume.app/p/testprotected`
- **Edge Case Portfolio:** `https://wiseresume.app/p/testedgecase`

### Using in E2E Tests

The fixture credentials are exported from `portfolio-test-fixtures.ts`:

```typescript
import { TEST_FIXTURES } from '../fixtures/portfolio-test-fixtures';

// Use in tests
await page.goto(`/p/${TEST_FIXTURES.public.username}`);

// For protected portfolio
await page.fill('input[type="password"]', TEST_FIXTURES.protected.password);
await page.click('button[type="submit"]');
```

### Fixture Data Structure

Each fixture creates:
1. A profile in the `profiles` collection with `portfolio_enabled: true`
2. A resume in the `resumes` collection linked to the user

The fixtures are designed to exercise:
- **Public:** Standard portfolio rendering
- **Protected:** Password gate UI and SHA-256 password verification
- **Edge Case:** Null fields, empty arrays, special characters, missing data

### Cleanup

Run the cleanup command to remove all test fixtures:

```bash
npx tsx tests/e2e/fixtures/portfolio-test-fixtures.ts cleanup
```

This deletes:
- The test profiles from `profiles` collection
- Associated resumes from `resumes` collection
