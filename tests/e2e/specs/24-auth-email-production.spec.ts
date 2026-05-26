import { test, expect, type Page, type Response } from '@playwright/test';

/**
 * Production auth + email-service flows (post email recovery deploy).
 *
 * Run against live site:
 *   E2E_BASE_URL=https://resume.thewise.cloud E2E_NO_WEBSERVER=1 E2E_SKIP_AUTH=1 ^
 *     npx playwright test tests/e2e/specs/24-auth-email-production.spec.ts
 *
 * Optional inbox for password-reset on a real account:
 *   E2E_AUTH_EMAIL=you@example.com
 */

const PROD_BASE = process.env.E2E_BASE_URL || 'https://resume.thewise.cloud';
const INBOX_EMAIL = (process.env.E2E_AUTH_EMAIL || '').trim().toLowerCase();
const APPWRITE_HOST = /cloud\.appwrite\.io/;

test.describe.configure({ mode: 'serial' });

test.use({
  baseURL: PROD_BASE,
  storageState: { cookies: [], origins: [] },
});

/** Wait for an Appwrite Functions execution whose body mentions email-service action. */
async function waitForEmailServiceExecution(
  page: Page,
  action: string,
  timeoutMs = 45_000,
): Promise<{ ok: boolean; status: number; bodyText: string }> {
  const response = await page.waitForResponse(
    (res: Response) => {
      if (!APPWRITE_HOST.test(res.url())) return false;
      if (!/\/functions\/[^/]+\/executions/.test(res.url())) return false;
      if (res.request().method() !== 'POST') return false;
      const post = res.request().postData() || '';
      return post.includes('email-service') || post.includes(action);
    },
    { timeout: timeoutMs },
  );

  const status = response.status();
  const bodyText = await response.text().catch(() => '');

  let ok = status < 400;
  try {
    const execution = JSON.parse(bodyText) as {
      status?: string;
      responseStatusCode?: number;
      responseBody?: string;
    };
    if (execution.responseStatusCode !== undefined && execution.responseStatusCode >= 400) {
      ok = false;
    } else if (execution.status === 'failed') {
      ok = false;
    } else if (typeof execution.responseBody === 'string') {
      const inner = JSON.parse(execution.responseBody) as { success?: boolean; error?: string };
      ok = inner.success === true || (action === 'send-password-reset' && !inner.error);
    }
  } catch {
    ok =
      ok &&
      (bodyText.includes('"success":true') ||
        bodyText.includes('"success": true') ||
        (action === 'send-password-reset' && bodyText.includes('success')));
  }

  return { ok, status, bodyText };
}

function uniqueSignupEmail(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  if (INBOX_EMAIL && INBOX_EMAIL.includes('@')) {
    const [local, domain] = INBOX_EMAIL.split('@');
    return `${local}+e2e-${ts}-${rand}@${domain}`;
  }
  return `wr-e2e-${ts}-${rand}@delivered.resend.dev`;
}

test.describe('Auth & email-service (production)', () => {
  test('auth page hides Import Job FAB', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /WiseResume AI/i })).toBeVisible();
    await expect(page.getByText('Import Job', { exact: true })).toHaveCount(0);
  });

  test('forgot password invokes email-service and shows success toast', async ({ page }) => {
    const resetEmail = INBOX_EMAIL || 'e2e-password-reset@delivered.resend.dev';

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();

    const execPromise = waitForEmailServiceExecution(page, 'send-password-reset');
    await page.getByPlaceholder('Email').fill(resetEmail);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    const exec = await execPromise;
    test.info().annotations.push({
      type: 'email-service-exec',
      description: JSON.stringify({ status: exec.status, snippet: exec.bodyText.slice(0, 400) }),
    });
    expect(exec.ok, `email-service execution failed: ${exec.bodyText.slice(0, 300)}`).toBe(true);

    await expect(page.getByText(/Reset link sent/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'WiseResume AI' })).toBeVisible();
  });

  test('sign up creates account, lands on verify-email, resend succeeds', async ({ page }) => {
    const email = uniqueSignupEmail();
    const password = `E2eTest!${Date.now().toString(36)}Aa`;
    const name = 'E2E Playwright Demo';

    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Sign up' }).click();

    const verifyExecPromise = waitForEmailServiceExecution(page, 'send-verification').catch(() => ({
      ok: false,
      status: 0,
      bodyText: 'no execution captured during signup',
    }));

    await page.getByPlaceholder('Full Name').fill(name);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible({ timeout: 20_000 });

    const signupExec = await verifyExecPromise;
    test.info().annotations.push({
      type: 'signup-email',
      description: JSON.stringify({ email, signupExec: signupExec.bodyText.slice(0, 400) }),
    });

    const resendExecPromise = waitForEmailServiceExecution(page, 'send-verification');
    await page.getByRole('button', { name: 'Resend verification email' }).click();
    const resendExec = await resendExecPromise;

    test.info().annotations.push({
      type: 'resend-email',
      description: JSON.stringify({ status: resendExec.status, snippet: resendExec.bodyText.slice(0, 400) }),
    });
    expect(resendExec.ok, `resend failed: ${resendExec.bodyText.slice(0, 300)}`).toBe(true);
    await expect(page.getByText(/Verification email sent/i)).toBeVisible({ timeout: 20_000 });

    test.info().annotations.push({
      type: 'credentials',
      description: `Demo account (save to verify inbox): ${email} / ${password}`,
    });
  });

  test('verify-email page has no Import Job FAB', async ({ page }) => {
    await page.goto('/auth/verify-email', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Import Job', { exact: true })).toHaveCount(0);
  });
});
