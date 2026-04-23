import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5000';
const HEADLESS = process.env.E2E_HEADED !== '1';

export default defineConfig({
  testDir: './tests/e2e/specs',
  outputDir: './tests/e2e/.artifacts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/e2e-results.json' }],
    ['html', { outputFolder: 'reports/e2e-html', open: 'never' }],
  ],
  globalSetup: path.join(__dirname, 'tests/e2e/fixtures/global-setup.ts'),
  use: {
    baseURL: BASE_URL,
    headless: HEADLESS,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: 'tests/e2e/.auth/user.json',
    ignoreHTTPSErrors: true,
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command: 'echo "Using existing dev server on ' + BASE_URL + '"',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 5_000,
      },
});
