import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const TEST_EMAIL = process.env.E2E_USER_EMAIL ?? '';
const TEST_PASSWORD = process.env.E2E_USER_PASSWORD ?? '';
const STORAGE_PATH = 'tests/e2e/.auth/user.json';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5000';

/**
 * Global setup: signs in once via Kinde and persists the authenticated
 * storage state for reuse by every test. Skipped if `E2E_SKIP_AUTH=1`
 * or if a fresh `user.json` already exists and `E2E_FORCE_AUTH` is unset.
 *
 * Limitations documented in reports/e2e-wiseresume-report.md:
 *   - Kinde may show a CAPTCHA / bot-challenge on a fresh runner IP.
 *     If detected the setup writes an empty storage state, every
 *     dependent test is then skipped, and the report calls it out.
 *   - The Replit dev server runs on port 5000 (the `start` script
 *     uses 3000; `npm run dev` uses 5000 via vite.config.ts). The
 *     baseURL defaults to :5000 to match the running workflow.
 */
export default async function globalSetup(_config: FullConfig) {
  if (process.env.E2E_SKIP_AUTH === '1') {
    ensureEmptyStorageState();
    return;
  }
  if (existsSync(STORAGE_PATH) && !process.env.E2E_FORCE_AUTH) {
    return;
  }
  ensureEmptyStorageState();
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    writeFileSync('tests/e2e/.auth/auth-status.json', JSON.stringify({
      signedIn: false,
      blockerReason: 'E2E_USER_EMAIL / E2E_USER_PASSWORD not set; cannot sign in. Export them or set E2E_SKIP_AUTH=1.',
      consoleErrors: [],
      finalUrl: '',
      timestamp: new Date().toISOString(),
    }, null, 2));
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const consoleErrors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`pageerror: ${e.message}`));

  let signedIn = false;
  let blockerReason: string | null = null;

  try {
    await page.goto(`${BASE_URL}/sign-in?mode=login`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(u => /kinde\.com|\/dashboard|\/auth\/callback/.test(u.toString()), { timeout: 30_000 }).catch(() => null);

    if (page.url().includes('kinde.com')) {
      const emailField = page.locator('input[type="email"], input[name="p_email"], input[id*="email"]').first();
      await emailField.waitFor({ state: 'visible', timeout: 20_000 });
      await emailField.fill(TEST_EMAIL);

      const continueBtn = page.locator('button[type="submit"], button:has-text("Continue"), button:has-text("Sign in")').first();
      await continueBtn.click();

      const passwordField = page.locator('input[type="password"], input[name="p_password"]').first();
      await passwordField.waitFor({ state: 'visible', timeout: 20_000 });
      await passwordField.fill(TEST_PASSWORD);

      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Continue")').first();
      await submitBtn.click();

      await page.waitForURL(u => u.toString().startsWith(BASE_URL), { timeout: 45_000 });
    }

    await page.waitForURL(u => /\/(dashboard|onboarding)/.test(u.toString()) || u.toString().endsWith('/'), { timeout: 30_000 }).catch(() => null);

    const cookies = await ctx.cookies();
    const storage = await ctx.storageState();
    if (cookies.length > 0 || storage.origins.some(o => o.localStorage.length > 0)) {
      await ctx.storageState({ path: STORAGE_PATH });
      signedIn = true;
    } else {
      blockerReason = `Unable to capture authenticated session. Final URL: ${page.url()}`;
    }
  } catch (e) {
    blockerReason = `Auth setup threw: ${(e as Error).message}`;
  } finally {
    writeFileSync('tests/e2e/.auth/auth-status.json', JSON.stringify({
      signedIn,
      blockerReason,
      consoleErrors: consoleErrors.slice(0, 30),
      finalUrl: page.url(),
      timestamp: new Date().toISOString(),
    }, null, 2));
    await browser.close();
  }
}

function ensureEmptyStorageState() {
  mkdirSync(dirname(STORAGE_PATH), { recursive: true });
  if (!existsSync(STORAGE_PATH)) {
    writeFileSync(STORAGE_PATH, JSON.stringify({ cookies: [], origins: [] }));
  }
}
