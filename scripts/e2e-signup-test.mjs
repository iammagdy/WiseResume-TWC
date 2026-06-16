/**
 * Sign up a test account on production and trigger verification email.
 * Usage: node scripts/e2e-signup-test.mjs [email] [password] [name]
 */
import { chromium } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'https://wiseresume.app';
const EMAIL = (process.argv[2] || 'magdy.saber+9@outlook.com').toLowerCase();
const PASSWORD = process.argv[3] || 'P@ssw0rd';
const NAME = process.argv[4] || 'Magdy Saber Test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.getByPlaceholder('Full Name').waitFor({ state: 'visible', timeout: 20_000 });

  await page.getByPlaceholder('Full Name').fill(NAME);
  await page.getByPlaceholder('Email').fill(EMAIL);
  await page.getByPlaceholder('Password').fill(PASSWORD);

  const execPromise = page
    .waitForResponse(
      (res) =>
        /cloud\.appwrite\.io/.test(res.url()) &&
        /\/executions/.test(res.url()) &&
        res.request().method() === 'POST' &&
        (res.request().postData() || '').includes('send-verification'),
      { timeout: 90_000 },
    )
    .catch(() => null);

  await page.getByRole('button', { name: 'Create Account' }).click();

  const exists = await page
    .getByText(/already exists|Registration failed/i)
    .isVisible({ timeout: 8_000 })
    .catch(() => false);

  if (exists) {
    console.log('Account exists — logging in and resending…');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByPlaceholder('Email').fill(EMAIL);
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.waitForURL(/\/(dashboard|auth\/verify-email)/, { timeout: 60_000 });
    if (!page.url().includes('verify-email')) {
      await page.goto(`${BASE}/auth/verify-email`, { waitUntil: 'domcontentloaded' });
    }
    const resendExec = page.waitForResponse(
      (res) =>
        /cloud\.appwrite\.io/.test(res.url()) &&
        /\/executions/.test(res.url()) &&
        (res.request().postData() || '').includes('send-verification'),
      { timeout: 90_000 },
    );
    await page.getByRole('button', { name: /Resend verification email/i }).click();
    const res = await resendExec;
    console.log('Resend status:', res?.status());
    console.log('Body:', (await res?.text().catch(() => ''))?.slice(0, 400));
  } else {
    await page.waitForURL(/\/auth\/verify-email/, { timeout: 90_000 });
    const res = await execPromise;
    console.log('Signup OK:', page.url());
    console.log('Execution status:', res?.status());
    console.log('Body:', (await res?.text().catch(() => ''))?.slice(0, 400));
  }

  await page.waitForTimeout(3_000);
  const toast = await page.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  console.log('Toasts:', toast.join(' | ') || '(none)');

  console.log('\n--- Test account ---');
  console.log('Email:', EMAIL);
  console.log('Password:', PASSWORD);
  console.log('Check inbox for: Verify your WiseResume email address');
} finally {
  await browser.close();
}
