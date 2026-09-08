import { chromium } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const email = String(process.env.WISE_RESUME_E2E_EMAIL || '').trim().toLowerCase();
const password = String(process.env.WISE_RESUME_E2E_PASSWORD || '');

// PUBLIC WHOP SANDBOX TEST DATA — NOT REAL PAYMENT CREDENTIALS.
const testCard = '4242424242424242';
const testExpiry = '12/34';
const testCvc = '123';

if (!email || !password) throw new Error('protected Appwrite E2E credentials are missing');
if (process.env.WHOP_ACCESS_ENVIRONMENT !== 'sandbox' || process.env.WHOP_CHECKOUT_ENVIRONMENT !== 'sandbox') {
  throw new Error('WHOP_SANDBOX_PAYMENT_ENVIRONMENT_GUARD_FAILURE');
}
for (const [key, expected] of Object.entries({
  WHOP_SANDBOX_COMPANY_ID: 'biz_4To0HUTEuAbKkl',
  WHOP_SANDBOX_PRODUCT_ID: 'prod_b7Vm6yYS2ROI6',
  WHOP_SANDBOX_PRO_PLAN_ID: 'plan_ECWULjIBMFBE5',
  WHOP_SANDBOX_PREMIUM_PLAN_ID: 'plan_YCBJ6FvCkKuRv',
})) if (process.env[key] !== expected) throw new Error('WHOP_SANDBOX_PAYMENT_ENVIRONMENT_GUARD_FAILURE');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
const page = await context.newPage();

page.on('response', async (response) => {
  if (!/\/functions\//i.test(response.url())) return;
  const requestUrl = response.url();
  const functionName = requestUrl.match(/functions\/([^/]+)/i)?.[1] || 'unknown';
  if (!/billing|checkout/i.test(functionName)) return;
  let code = '';
  let shape = '';
  try {
    const payload = await response.json();
    code = typeof payload?.error?.code === 'string' ? payload.error.code : typeof payload?.code === 'string' ? payload.code : '';
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    const checkoutUrl = typeof data?.checkout_url === 'string' ? data.checkout_url : '';
    shape = `state=${typeof data?.state === 'string' ? data.state : 'none'} provider=${typeof data?.provider === 'string' ? data.provider : 'none'} plan=${typeof data?.plan === 'string' ? data.plan : 'none'} checkout=${Boolean(checkoutUrl)} origin=${checkoutUrl ? new URL(checkoutUrl).origin : 'none'}`;
  } catch {}
  console.log(`BILLING_CHECKOUT_RESPONSE status=${response.status()} code=${code || 'none'} ${shape}`);
});

async function login() {
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|onboarding|subscription|auth\/verify-email)/, { timeout: 60_000 });
}

async function assertSubscriptionSurface() {
  await page.goto(`${baseUrl}/subscription`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: /Subscribe/i }).first().waitFor({ state: 'visible', timeout: 30_000 });
  const body = await page.locator('body').innerText();
  if (!/\$5/.test(body) || !/\$10/.test(body)) throw new Error('subscription prices are not visible');
  if (/30\s*day|one[- ]time/i.test(body)) throw new Error('one-time checkout is visible');
  if (/coupon|promo code/i.test(body)) throw new Error('customer coupon UI is visible');
}

async function openCheckoutModal(planName) {
  const planButton = page.getByRole('button', { name: /Subscribe/i }).first();
  if (planName === 'premium') {
    const cards = page.locator('section').filter({ hasText: /\$10/ });
    await cards.getByRole('button', { name: /Subscribe/i }).click();
  } else {
    await planButton.click();
  }
  await page.getByRole('button', { name: /Continue with Whop/i }).waitFor({ state: 'visible', timeout: 30_000 });
  const providerChoices = page.locator('fieldset button');
  if (await providerChoices.count() < 2) throw new Error('provider choices are not visible');
  const whopChoice = providerChoices.filter({ hasText: /Whop/i }).first();
  const paypalChoice = providerChoices.filter({ hasText: /PayPal/i }).first();
  await paypalChoice.waitFor({ state: 'visible', timeout: 30_000 });
  if ((await whopChoice.getAttribute('aria-pressed')) !== 'true') throw new Error('Whop is not the default provider');
}

async function openProviderCheckout(provider, planPattern) {
  const button = page.getByRole('button', { name: new RegExp(`Continue with ${provider}`, 'i') }).first();
  await button.click();
  try {
    await page.waitForURL(url => provider === 'Whop' ? /sandbox\.whop\.com/i.test(url.toString()) : /paypal\.com/i.test(url.toString()), { timeout: 20_000 });
  } catch {
    throw new Error(`${provider.toUpperCase()}_CHECKOUT_NAVIGATION_FAILED`);
  }
  if (provider === 'Whop' && new URL(page.url()).hostname !== 'sandbox.whop.com') throw new Error('WHOP_SANDBOX_PAYMENT_ENVIRONMENT_GUARD_FAILURE');
  const checkoutBody = await page.locator('body').innerText().catch(() => '');
  if (planPattern && !planPattern.test(checkoutBody) && provider === 'Whop') throw new Error('hosted checkout plan/price was not visible');
  return page.url();
}

async function firstVisibleFrameLocator(selector) {
  for (const frame of page.frames()) {
    const locator = frame.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

try {
  await login();
  await assertSubscriptionSurface();
  await openCheckoutModal('pro');

  const proUrl = await openProviderCheckout('Whop', /\$5|5\.00/);
  console.log(`WHOP_PRO_CHECKOUT_OPEN=true origin=${new URL(proUrl).origin}`);

  // These are Whop's public Sandbox test values, used only after the
  // environment, hostname, and catalog guards above have passed.
  const cardField = await firstVisibleFrameLocator('input[autocomplete="cc-number"], input[name*="card" i]');
  if (!cardField) throw new Error('Whop Sandbox card field was not available');
  await cardField.fill(testCard);
  const expiryField = await firstVisibleFrameLocator('input[autocomplete="cc-exp"], input[name*="exp" i]');
  const cvcField = await firstVisibleFrameLocator('input[autocomplete="cc-csc"], input[name*="cvc" i], input[name*="cvv" i]');
  if (!expiryField || !cvcField) throw new Error('Whop Sandbox expiry/CVC fields were not available');
  await expiryField.fill(testExpiry);
  await cvcField.fill(testCvc);
  const submit = page.getByRole('button', { name: /pay|subscribe|start/i }).last();
  await submit.click();
  await page.waitForTimeout(12_000);
  if (/sandbox\.whop\.com/i.test(page.url())) throw new Error('Whop Sandbox checkout did not return after payment submission');
  console.log('WHOP_PRO_PAYMENT_SUBMITTED=true');
} finally {
  await context.close();
  await browser.close();
}
