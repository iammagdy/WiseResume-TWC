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
        // Auto-start the full dev stack (Express API + Vite frontend on
        // port 5000) if no server is already responding on baseURL.
        // `reuseExistingServer: true` short-circuits when the workflow
        // already has it up, so this is a no-op in the normal Replit
        // development case but still satisfies CI / cold-boot runs.
        command: 'npm run server:dev & npm run dev',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
