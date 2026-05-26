/**
 * Log in +8 on production and resend verification email.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'https://resume.thewise.cloud';
const EMAIL = 'magdy.saber+8@outlook.com';
const PASSWORD = 'P@ssw0rd';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByPlaceholder('Email').fill(EMAIL);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  await page.waitForURL(/\/(dashboard|auth\/verify-email)/, { timeout: 60_000 });
  console.log('After login:', page.url());

  if (!page.url().includes('verify-email')) {
    await page.goto(`${BASE}/auth/verify-email`, { waitUntil: 'domcontentloaded' });
  }

  await page.getByRole('button', { name: /Resend verification email/i }).click();
  await page.waitForTimeout(8_000);

  const toast = await page.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  console.log('Toasts:', toast.join(' | ') || '(none captured)');

  const heading = await page.getByRole('heading').first().textContent().catch(() => '');
  console.log('Page heading:', heading?.trim());
  console.log('\n--- Inbox ---');
  console.log('Email:', EMAIL);
  console.log('Password:', PASSWORD);
  console.log('Look for: Verify your WiseResume email address');
} finally {
  await browser.close();
}
