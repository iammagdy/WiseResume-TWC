import { chromium } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const email = String(process.env.WISE_RESUME_E2E_EMAIL || '').trim().toLowerCase();
const password = String(process.env.WISE_RESUME_E2E_PASSWORD || '');
const testCard = String(process.env.WHOP_SANDBOX_TEST_CARD || '').trim();
const testExpiry = String(process.env.WHOP_SANDBOX_TEST_EXPIRY || '').trim();
const testCvc = String(process.env.WHOP_SANDBOX_TEST_CVC || '').trim();

if (!email || !password) throw new Error('protected Appwrite E2E credentials are missing');
if (!testCard || !testExpiry || !testCvc) throw new Error('protected Whop Sandbox payment test inputs are not configured; refusing to embed or print payment test data');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
const page = await context.newPage();

async function login() {
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/((dashboard|onboarding|subscription))/, { timeout: 60_000 });
}

async function assertSubscriptionSurface() {
  await page.goto(`${baseUrl}/subscription`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByText(/Whop/i).first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByText(/PayPal/i).first().waitFor({ state: 'visible', timeout: 30_000 });
  const body = await page.locator('body').innerText();
  if (!/\$5/.test(body) || !/\$10/.test(body)) throw new Error('subscription prices are not visible');
  if (/30\s*day|one[- ]time/i.test(body)) throw new Error('one-time checkout is visible');
  if (/coupon|promo code/i.test(body)) throw new Error('customer coupon UI is visible');
}

async function openProviderCheckout(provider, planPattern) {
  const button = page.getByRole('button', { name: new RegExp(`Continue with ${provider}`, 'i') }).first();
  await button.click();
  await page.waitForURL(url => provider === 'Whop' ? /sandbox\.whop\.com/i.test(url.toString()) : /paypal\.com/i.test(url.toString()), { timeout: 60_000 });
  const checkoutBody = await page.locator('body').innerText().catch(() => '');
  if (planPattern && !planPattern.test(checkoutBody) && provider === 'Whop') throw new Error('hosted checkout plan/price was not visible');
  return page.url();
}

try {
  await login();
  await assertSubscriptionSurface();

  const proUrl = await openProviderCheckout('Whop', /\$5|5\.00/);
  console.log(`WHOP_PRO_CHECKOUT_OPEN=true origin=${new URL(proUrl).origin}`);

  // Payment fields are provider-hosted. The card value is injected only at
  // runtime from a protected secret and is never logged, stored, or uploaded.
  const cardField = page.locator('input[autocomplete="cc-number"], input[name*="card" i]').first();
  await cardField.waitFor({ state: 'visible', timeout: 30_000 });
  await cardField.fill(testCard);
  const expiryField = page.locator('input[autocomplete="cc-exp"], input[name*="exp" i]').first();
  const cvcField = page.locator('input[autocomplete="cc-csc"], input[name*="cvc" i], input[name*="cvv" i]').first();
  await expiryField.fill(testExpiry);
  await cvcField.fill(testCvc);
  const submit = page.getByRole('button', { name: /pay|subscribe|start/i }).last();
  await submit.click();
  await page.waitForTimeout(8_000);
  if (/sandbox\.whop\.com/i.test(page.url())) throw new Error('Whop Sandbox checkout did not return after payment submission');
  console.log('WHOP_PRO_PAYMENT_SUBMITTED=true');
} finally {
  await context.close();
  await browser.close();
}
