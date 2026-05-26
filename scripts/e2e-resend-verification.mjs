import { chromium } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'https://resume.thewise.cloud';
const EMAIL = (process.argv[2] || 'magdy.saber+9@outlook.com').toLowerCase();
const PASSWORD = process.argv[3] || 'P@ssw0rd';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
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
  const body = await res.text().catch(() => '');
  console.log('URL:', page.url());
  console.log('HTTP:', res.status());
  console.log('Execution:', body.slice(0, 500));
  await page.waitForTimeout(3_000);
  const toast = await page.locator('[data-sonner-toast]').allTextContents().catch(() => []);
  console.log('Toasts:', toast.join(' | ') || '(none)');
  console.log('\nEmail:', EMAIL, '| Password:', PASSWORD);
} finally {
  await browser.close();
}
