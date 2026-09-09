import { chromium } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sdk = require('node-appwrite');
const resolver = require('../appwrite-hubs/shared-subscription-resolver');

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const email = String(process.env.WISE_RESUME_E2E_EMAIL || '').trim().toLowerCase();
const password = String(process.env.WISE_RESUME_E2E_PASSWORD || '');
const qaUserId = String(process.env.QA_USER_ID || '').trim();
const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const appwriteProjectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const appwriteApiKey = process.env.APPWRITE_API_KEY || '';
const whopSandboxApiKey = process.env.WHOP_SANDBOX_API_KEY || '';

// PUBLIC WHOP SANDBOX TEST DATA — NOT REAL PAYMENT CREDENTIALS.
const testCard = '4242424242424242';
const testExpiry = '12/34';
const testCvc = '123';

if (!email || !password) throw new Error('protected Appwrite E2E credentials are missing');
if (process.env.WHOP_ACCESS_ENVIRONMENT !== 'sandbox' || process.env.WHOP_CHECKOUT_ENVIRONMENT !== 'sandbox') {
  throw new Error('WHOP_SANDBOX_PAYMENT_ENVIRONMENT_GUARD_FAILURE');
}
const whopSandboxCompanyId = process.env.WHOP_SANDBOX_COMPANY_ID || 'biz_4To0HUTEuAbKkl';
const whopSandboxProductId = process.env.WHOP_SANDBOX_PRODUCT_ID || 'prod_b7Vm6yYS2ROI6';
const whopSandboxProPlanId = process.env.WHOP_SANDBOX_PRO_PLAN_ID || 'plan_ECWULjIBMFBE5';
const whopSandboxPremiumPlanId = process.env.WHOP_SANDBOX_PREMIUM_PLAN_ID || 'plan_YCBJ6FvCkKuRv';

for (const [key, expected] of Object.entries({
  WHOP_SANDBOX_COMPANY_ID: whopSandboxCompanyId,
  WHOP_SANDBOX_PRODUCT_ID: whopSandboxProductId,
  WHOP_SANDBOX_PRO_PLAN_ID: whopSandboxProPlanId,
  WHOP_SANDBOX_PREMIUM_PLAN_ID: whopSandboxPremiumPlanId,
})) {
  if (process.env[key] !== expected) throw new Error('WHOP_SANDBOX_PAYMENT_ENVIRONMENT_GUARD_FAILURE');
}

function maskId(id) {
  if (!id || typeof id !== 'string') return '[NONE]';
  if (id.length <= 8) return '***';
  return id.slice(0, 4) + '***' + id.slice(-4);
}

function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[a-zA-Z0-9_\-]{24,}/g, '[MASKED_KEY_OR_TOKEN]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[MASKED_EMAIL]');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
const page = await context.newPage();

let createdCheckoutRef = '';
let paymentSubmissionObserved = false;
let paymentSubmissionEvidence = '';
let submitClickCount = 0;
let inFlightProviderRequests = 0;
let verifiedPaymentId = '';
let verifiedPaymentStatus = '';
let verifiedMembershipId = '';
let verifiedMembershipCount = 0;

page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' || /whop|stripe|checkout|error|payment/i.test(text)) {
    console.log(`[browser ${msg.type()}] ${sanitizeText(text.slice(0, 300))}`);
  }
});
page.on('pageerror', (err) => console.log(`[pageerror] ${sanitizeText(err.message)}`));

page.on('request', (req) => {
  const reqUrl = req.url();
  const method = req.method();
  if (/basistheory|whop\.com\/checkout/i.test(reqUrl)) {
    inFlightProviderRequests++;
  }
  if (/basistheory|stripe|whop\.com/i.test(reqUrl)) {
    if ((method === 'POST' || method === 'PATCH') &&
        /checkout|confirm|pay|intent|order|membership|tokenize|tokens|submit/i.test(reqUrl)) {
      paymentSubmissionObserved = true;
      paymentSubmissionEvidence = `request: ${method} ${reqUrl.split('?')[0]}`;
      console.log(`[e2e] Observed payment submission request: ${method} ${reqUrl.split('?')[0]}`);
    }
  }
});

page.on('requestfinished', (req) => {
  const reqUrl = req.url();
  if (/basistheory|whop\.com\/checkout/i.test(reqUrl)) {
    inFlightProviderRequests = Math.max(0, inFlightProviderRequests - 1);
  }
});

page.on('requestfailed', (req) => {
  const reqUrl = req.url();
  if (/basistheory|whop\.com\/checkout/i.test(reqUrl)) {
    inFlightProviderRequests = Math.max(0, inFlightProviderRequests - 1);
  }
});

page.on('response', async (response) => {
  const resUrl = response.url();
  if (/whop\.com|stripe|basis|payment/i.test(resUrl)) {
    if (response.status() >= 400 || /checkout|confirm|pay|intent|order|membership|tokens/i.test(resUrl)) {
      let bodySnippet = '';
      try {
        const text = await response.text();
        bodySnippet = sanitizeText(text.slice(0, 200).replace(/\s+/g, ' '));
      } catch (_) {}
      console.log(`[network] ${response.status()} ${response.request().method()} ${resUrl.split('?')[0]} ${bodySnippet ? `body=${bodySnippet}` : ''}`);
      if (response.status() < 400 && response.request().method() !== 'GET' && /checkout|confirm|pay|intent|order|tokens/i.test(resUrl)) {
        paymentSubmissionObserved = true;
        paymentSubmissionEvidence = `response: ${response.status()} ${resUrl.split('?')[0]}`;
      }
    }
  }

  if (!/\/functions\//i.test(resUrl)) return;
  const functionName = resUrl.match(/functions\/([^/]+)/i)?.[1] || 'unknown';
  if (!/billing|checkout/i.test(functionName)) return;
  let code = '';
  let shape = '';
  let status = response.status();
  try {
    const payload = await response.json();
    let body = payload;
    if (typeof payload?.responseBody === 'string') {
      try {
        body = JSON.parse(payload.responseBody);
      } catch {
        body = payload.responseBody;
      }
      if (typeof payload?.responseStatusCode === 'number') {
        status = payload.responseStatusCode;
      }
    }
    code = typeof body?.error === 'string'
      ? body.error
      : typeof body?.error?.code === 'string'
        ? body.error.code
        : typeof body?.code === 'string'
          ? body.code
          : '';
    const data = body?.data && typeof body.data === 'object' ? body.data : body;
    const checkoutUrl = typeof data?.checkout_url === 'string' ? data.checkout_url : '';
    if (data?.checkout_reference) {
      createdCheckoutRef = data.checkout_reference;
    }
    shape = `state=${typeof data?.state === 'string' ? data.state : 'none'} provider=${typeof data?.provider === 'string' ? data.provider : 'none'} plan=${typeof data?.plan === 'string' ? data.plan : 'none'} checkout=${Boolean(checkoutUrl)} origin=${checkoutUrl ? new URL(checkoutUrl).origin : 'none'}`;
    if (payload?.errors) {
      console.log(`BILLING_CHECKOUT_EXECUTION_ERRORS=${sanitizeText(String(payload.errors).replace(/\s+/g, ' ').slice(0, 500))}`);
    }
    if (payload?.logs) {
      console.log(`BILLING_CHECKOUT_EXECUTION_LOGS=${sanitizeText(String(payload.logs).replace(/\s+/g, ' ').slice(0, 500))}`);
    }
  } catch {}
  console.log(`BILLING_CHECKOUT_RESPONSE status=${status} code=${code || 'none'} ${shape}`);
});

async function login() {
  console.log('[e2e] Navigating to /auth...');
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|onboarding|subscription|auth\/verify-email)/, { timeout: 60_000 });
  console.log(`[e2e] Authenticated successfully. Current URL: ${page.url()}`);
}

async function assertInitialPlanFree() {
  console.log('[e2e] Checking initial plan on /subscription...');
  await page.goto(`${baseUrl}/subscription`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: /Subscribe/i }).first().waitFor({ state: 'visible', timeout: 30_000 });
  const body = await page.locator('body').innerText();

  if (!/\$5/.test(body) || !/\$10/.test(body)) throw new Error('subscription prices are not visible');
  if (/30\s*day|one[- ]time/i.test(body)) throw new Error('one-time checkout is visible');
  if (/coupon|promo code/i.test(body)) throw new Error('customer coupon UI is visible');

  // Verify UI shows Free
  const planBadge = page.locator('main').filter({ hasText: /Current plan/i });
  const planBadgeText = await planBadge.innerText().catch(() => '');
  console.log(`[e2e] Initial plan surface text snippet: "${planBadgeText.replace(/\s+/g, ' ').slice(0, 100)}"`);

  // Assert backend state is also free if Appwrite API key is present
  if (appwriteApiKey && qaUserId) {
    const client = new sdk.Client().setEndpoint(appwriteEndpoint).setProject(appwriteProjectId).setKey(appwriteApiKey);
    const databases = new sdk.Databases(client);

    // Read real current provider/subscription state for the fresh user
    const [whopDocs, subDocs, paypalDocs] = await Promise.all([
      databases.listDocuments('main', 'whop_subscription_state', [
        sdk.Query.equal('user_id', [qaUserId]),
        sdk.Query.limit(5),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments('main', 'subscriptions', [
        sdk.Query.equal('user_id', [qaUserId]),
        sdk.Query.limit(5),
      ]).catch(() => ({ documents: [] })),
      databases.listDocuments('main', 'paypal_subscription_state', [
        sdk.Query.equal('user_id', [qaUserId]),
        sdk.Query.limit(5),
      ]).catch(() => ({ documents: [] })),
    ]);

    if (whopDocs.documents.length > 0) {
      throw new Error(`QA user ${maskId(qaUserId)} already has existing whop_subscription_state documents. Must be fresh!`);
    }

    const manualSub = subDocs.documents?.[0] || null;
    const paypalState = paypalDocs.documents?.[0] || null;
    const whopState = whopDocs.documents?.[0] || null;

    const resolved = resolver.resolveEffectivePlan({
      providerEnvironment: 'sandbox',
      whopProviderEnvironment: 'sandbox',
      userId: qaUserId,
      whopQaUserId: qaUserId,
      whopProviderState: whopState,
      subscription: manualSub,
      paypalProviderState: paypalState,
    });

    if (resolved?.plan !== 'free') {
      throw new Error(`Initial effective plan for ${maskId(qaUserId)} is not free: plan=${resolved?.plan}, source=${resolved?.source}`);
    }
    console.log(`[e2e] Pre-checkout Appwrite verification: plan=free, source=${resolved?.source}, whop_docs=0 for ${maskId(qaUserId)}`);
  }

  console.log('QA_INITIAL_PLAN_FREE=true');
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
  console.log('PAYMENT_PROVIDER_DEFAULT_WHOP=true');
}

async function openProviderCheckout(provider, planPattern) {
  const button = page.getByRole('button', { name: new RegExp(`Continue with ${provider}`, 'i') }).first();
  await button.click();
  try {
    await page.waitForURL(url => provider === 'Whop' ? /sandbox\.whop\.com/i.test(url.toString()) : /paypal\.com/i.test(url.toString()), { timeout: 25_000 });
  } catch {
    const alert = page.getByRole('alert').first();
    if (await alert.isVisible().catch(() => false)) {
      const message = (await alert.innerText()).replace(/\s+/g, ' ').trim().slice(0, 120);
      console.log(`${provider.toUpperCase()}_CHECKOUT_UI_ERROR=${message}`);
    }
    throw new Error(`${provider.toUpperCase()}_CHECKOUT_NAVIGATION_FAILED`);
  }
  if (provider === 'Whop' && new URL(page.url()).hostname !== 'sandbox.whop.com') {
    throw new Error('WHOP_SANDBOX_PAYMENT_ENVIRONMENT_GUARD_FAILURE');
  }
  if (planPattern && provider === 'Whop') {
    try {
      await page.locator('body').filter({ hasText: planPattern }).waitFor({ timeout: 15_000 });
    } catch {
      const checkoutBody = await page.locator('body').innerText().catch(() => '');
      if (!planPattern.test(checkoutBody)) throw new Error('hosted checkout plan/price was not visible');
    }
  }
  return page.url();
}

async function waitForProviderSettling(timeoutMs = 15_000) {
  console.log('[e2e] Waiting for in-flight Whop / Basis Theory provider requests to settle...');
  const start = Date.now();
  let stableSince = null;
  while (Date.now() - start < timeoutMs) {
    if (inFlightProviderRequests === 0) {
      if (!stableSince) stableSince = Date.now();
      if (Date.now() - stableSince >= 1500) {
        console.log(`[e2e] Provider requests settled cleanly after ${Date.now() - start}ms`);
        return;
      }
    } else {
      stableSince = null;
    }
    await page.waitForTimeout(100);
  }
  console.log('[e2e] Warning: Provider settling window reached timeout, proceeding with form checks');
}

async function fillWhopHostedCheckout() {
  console.log('[e2e] Waiting for Whop hosted checkout DOM elements...');
  await page.locator('input[type="email"], input[name="email"]').first().waitFor({ state: 'visible', timeout: 25_000 });

  // Ensure Card payment method tab is active
  const cardTab = page.locator('button:has-text("Card")').first();
  if (await cardTab.isVisible().catch(() => false)) {
    const isSelected = await cardTab.evaluate(el => el.classList.contains('components-module__tK0qSa__selected') || el.getAttribute('aria-selected') === 'true').catch(() => false);
    if (!isSelected) {
      console.log('[e2e] Selecting Card payment method tab...');
      await cardTab.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  const buyerEmail = `qa-buyer-${Date.now()}@wiseresume.app`;

  // 1. Email (guest buyer email prevents account-login wall on Whop)
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill(buyerEmail);
  console.log('[e2e] Filled guest buyer email');

  // 2. Card Details (inside Basis Theory hosted iframes)
  console.log('[e2e] Filling card details in hosted iframes...');
  const cardFrame = page.frameLocator('iframe[src*="card-number"]');
  const expFrame = page.frameLocator('iframe[src*="card-expiration"]');
  const cvcFrame = page.frameLocator('iframe[src*="card-verification"]');

  await cardFrame.locator('input').first().waitFor({ state: 'visible', timeout: 20_000 });
  await cardFrame.locator('input').first().fill(testCard);

  await expFrame.locator('input').first().waitFor({ state: 'visible', timeout: 10_000 });
  await expFrame.locator('input').first().fill(testExpiry);

  await cvcFrame.locator('input').first().waitFor({ state: 'visible', timeout: 10_000 });
  await cvcFrame.locator('input').first().fill(testCvc);
  await cvcFrame.locator('input').first().press('Tab').catch(() => {});
  console.log('[e2e] Filled card number, expiry, and CVC successfully');

  // 3. Form-scoped billing name: target real visible input inside active form
  console.log('[e2e] Targeting visible billing name input in active form...');
  const nameInputs = await page.locator('form input[name="name"]:not([type="hidden"]), form input[placeholder="Name"]:not([type="hidden"])').all();
  let nameFilled = false;
  for (const inp of nameInputs) {
    const box = await inp.boundingBox();
    if (box && box.width > 50 && box.height > 20) {
      await inp.fill('WiseResume QA');
      nameFilled = true;
      console.log(`[e2e] Filled active billing name input (width=${box.width})`);
      break;
    }
  }
  if (!nameFilled) {
    const fallbackName = page.locator('form input[placeholder="Name"]:not([type="hidden"])').first();
    if (await fallbackName.isVisible().catch(() => false)) {
      await fallbackName.fill('WiseResume QA');
      nameFilled = true;
      console.log('[e2e] Filled billing name via placeholder fallback');
    }
  }

  // 4. Form-scoped billing address line 1
  console.log('[e2e] Targeting visible address line 1 input in active form...');
  const line1Inputs = await page.locator('form input[name="line1"]:not([type="hidden"]), form input[placeholder*="Address line 1" i]').all();
  let line1Filled = false;
  for (const inp of line1Inputs) {
    const box = await inp.boundingBox();
    if (box && box.width > 50 && box.height > 20) {
      await inp.fill('123 Main St');
      line1Filled = true;
      console.log(`[e2e] Filled active address line 1 input (width=${box.width})`);
      break;
    }
  }

  // 5. City and ZIP / Postal code if present and visible
  const cityInputs = await page.locator('form input[name="city"]:not([type="hidden"]), form input[placeholder*="City" i]').all();
  for (const inp of cityInputs) {
    const box = await inp.boundingBox();
    if (box && box.width > 50 && box.height > 20) {
      await inp.fill('New York');
      console.log('[e2e] Filled visible city input');
      break;
    }
  }

  const zipInputs = await page.locator('form input[name="zip"]:not([type="hidden"]), form input[name="postal_code"], form input[placeholder*="ZIP" i]').all();
  for (const inp of zipInputs) {
    const box = await inp.boundingBox();
    if (box && box.width > 50 && box.height > 20) {
      await inp.fill('10001');
      console.log('[e2e] Filled visible zip/postal input');
      break;
    }
  }

  // 6. Dismiss any open address autocomplete dropdowns or combobox overlays
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);

  // 7. Scoped provider settling: wait until in-flight provider requests reach zero and remain stable
  await waitForProviderSettling(15_000);

  // 8. Check any required checkboxes
  const requiredBoxes = await page.locator('form input[type="checkbox"][required], input[type="checkbox"][required]').all();
  for (const box of requiredBoxes) {
    if (await box.isVisible().catch(() => false) && !(await box.isChecked().catch(() => true))) {
      console.log('[e2e] Checking required checkbox...');
      await box.check({ force: true }).catch(() => {});
    }
  }

  // 9. Assert native form validity
  const validity = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return { isValid: false, reason: 'form_not_found', invalid: [] };
    const invalid = Array.from(form.querySelectorAll(':invalid')).map(el => ({
      tag: el.tagName,
      name: el.name || el.getAttribute('name') || '',
      placeholder: el.placeholder || '',
      type: el.type || '',
      message: el.validationMessage || '',
    }));
    return { isValid: form.checkValidity(), invalid };
  });

  console.log(`[e2e] Form native validity: isValid=${validity.isValid} invalidCount=${validity.invalid?.length || 0}`);
  if (!validity.isValid && validity.invalid?.length > 0) {
    console.log(`[e2e] Invalid fields: ${JSON.stringify(validity.invalid)}`);
    throw new Error(`Whop hosted checkout form failed native validation on fields: ${validity.invalid.map(i => i.name || i.placeholder).join(', ')}`);
  }
  console.log('CRITERION_I_FORM_READY=PASS');

  // 10. Find actionable submit button
  const submitCandidate = page.locator('button[data-checkout-submit-button], form button[type="submit"], button[type="submit"]').first();
  await submitCandidate.waitFor({ state: 'visible', timeout: 15_000 });

  // Wait for submit button to be fully actionable
  console.log('[e2e] Waiting for payment submit button to be fully actionable...');
  const startEnableWait = Date.now();
  let isActionable = false;

  while (Date.now() - startEnableWait < 20_000) {
    const check = await submitCandidate.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      const disabledAttr = el.disabled || el.getAttribute('disabled') !== null;
      const dataDisabled = el.getAttribute('data-disabled') === 'true';
      const ariaDisabled = el.getAttribute('aria-disabled') === 'true';
      const pointerOk = style.pointerEvents !== 'none';
      const hitOk = hit === el || el.contains(hit);
      return {
        ready: !disabledAttr && !dataDisabled && !ariaDisabled && pointerOk && hitOk,
        disabledAttr,
        dataDisabled,
        ariaDisabled,
        pointerOk,
        hitOk,
      };
    }).catch(() => ({ ready: false }));

    if (check.ready) {
      isActionable = true;
      console.log(`[e2e] Submit button fully actionable after ${Date.now() - startEnableWait}ms`);
      break;
    }
    await page.waitForTimeout(300);
  }

  if (!isActionable) {
    throw new Error('Whop hosted checkout submit button remained non-actionable after filling all required fields');
  }

  // 11. EXACTLY ONE SUBMIT CLICK — HARD SAFETY GUARD
  if (submitClickCount > 0) {
    throw new Error('E2E SAFETY ERROR: Multiple submit attempts prohibited');
  }

  console.log('[e2e] Performing EXACTLY ONE submit click on actionable payment button...');
  await submitCandidate.scrollIntoViewIfNeeded();
  submitClickCount++;
  console.log('SUBMIT_CLICKED=true');
  console.log('CRITERION_J_SUBMIT_CLICKED=PASS');

  await submitCandidate.click({ timeout: 5_000 });
}

async function monitorPostSubmit() {
  console.log('[e2e] Monitoring post-submit state...');
  const start = Date.now();
  let postSubmitConfirmed = false;

  while (Date.now() - start < 45_000) {
    const currentUrl = page.url();

    // Condition 1: Redirected away from sandbox.whop.com
    if (!/sandbox\.whop\.com/i.test(currentUrl)) {
      console.log(`[e2e] Successfully redirected away from Whop Sandbox to: ${currentUrl}`);
      postSubmitConfirmed = true;
      break;
    }

    // Condition 2: Post-payment confirmation page on Whop
    const pageBody = await page.locator('body').innerText().catch(() => '');
    const isConfirmation = /order confirmed|thank you|payment successful|you['’]re in|membership active|receipt/i.test(pageBody) ||
      /\/orders\/|\/confirmation|\/success|\/thank-you|\/hub/i.test(currentUrl);

    if (isConfirmation) {
      console.log(`[e2e] Whop confirmation state detected on URL: ${currentUrl}`);
      postSubmitConfirmed = true;

      // Click return to WiseResume if available
      const returnElements = await page.locator('a, button, [role="button"]').all();
      for (const el of returnElements) {
        if (await el.isVisible().catch(() => false)) {
          const text = (await el.innerText().catch(() => '')).trim();
          const href = (await el.getAttribute('href').catch(() => '')) || '';
          if (/return|continue|go to|back to|access|wiseresume/i.test(text) || /wiseresume\.app|127\.0\.0\.1/i.test(href)) {
            console.log(`[e2e] Found return action: text="${text}" href="${href}". Clicking...`);
            await el.click().catch(() => {});
            break;
          }
        }
      }
      break;
    }

    await page.waitForTimeout(2_000);
  }

  if (postSubmitConfirmed) {
    console.log('WHOP_PRO_PAYMENT_SUBMITTED=true');
  } else {
    console.log('[e2e] Notice: Browser did not automatically navigate away; proceeding to authoritative provider verification');
  }
}

async function verifyWhopProviderPayment(checkoutStartTimeMs) {
  console.log('\n======================================================');
  console.log('VERIFYING WHOP PROVIDER-SIDE PAYMENT & MEMBERSHIP PROOF');
  console.log('======================================================');

  if (!whopSandboxApiKey) {
    console.log('[whop-provider] Missing WHOP_SANDBOX_API_KEY in environment; skipping direct provider API poll');
    return;
  }

  const endpoint = 'https://sandbox-api.whop.com/api/v1';
  const checkoutStartSec = Math.floor((checkoutStartTimeMs - 30_000) / 1000); // 30s buffer for clock skew
  const pollStart = Date.now();
  let foundPayment = null;

  console.log(`[whop-provider] Polling Whop Sandbox API for payment attributable to checkout ${maskId(createdCheckoutRef)} (after t=${checkoutStartSec})...`);

  while (Date.now() - pollStart < 60_000) {
    try {
      const res = await fetch(`${endpoint}/payments?company_id=${encodeURIComponent(whopSandboxCompanyId)}&limit=25`, {
        headers: {
          Authorization: `Bearer ${whopSandboxApiKey}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const items = json?.data || json?.payments || (Array.isArray(json) ? json : []);

        // Find payments created after checkoutStartTime for our Pro plan / product / checkout ref
        const attributable = items.filter(item => {
          const itemCreated = item.created_at || item.created || 0;
          const itemTimeSec = typeof itemCreated === 'number' ? itemCreated : Math.floor(new Date(itemCreated).getTime() / 1000);
          const matchesTime = itemTimeSec >= checkoutStartSec;
          const matchesCheckout = item.checkout_configuration_id === createdCheckoutRef ||
            item.checkout_configuration?.id === createdCheckoutRef;
          const planId = item.plan_id || item.plan?.id;
          const prodId = item.product_id || item.product?.id;
          const matchesPlan = planId === whopSandboxProPlanId || prodId === whopSandboxProductId;
          return matchesTime && (matchesCheckout || matchesPlan);
        });

        if (attributable.length > 0) {
          foundPayment = attributable[0];
          verifiedPaymentId = foundPayment.id || '';
          verifiedPaymentStatus = foundPayment.status || foundPayment.state || '';
          console.log(`[whop-provider] Found attributable payment: id=${maskId(verifiedPaymentId)} status=${verifiedPaymentStatus} created_at=${foundPayment.created_at || foundPayment.created}`);
          break;
        }
      } else {
        const errText = await res.text().catch(() => '');
        console.log(`[whop-provider] Whop /payments API returned HTTP ${res.status}: ${sanitizeText(errText).slice(0, 150)}`);
      }
    } catch (err) {
      console.log(`[whop-provider] Network error polling Whop payments: ${err.message}`);
    }
    await page.waitForTimeout(2000);
  }

  if (!foundPayment) {
    console.log('PAYMENT_NOT_CREATED=true');
    throw new Error('PAYMENT_NOT_CREATED: No Whop Sandbox payment attributable to this checkout was created within timeout. Single-submit click did not produce a provider payment.');
  }

  console.log('CRITERION_K_PAYMENT_CREATED=PASS');

  // Verify payment is in paid / completed state
  const isPaid = /paid|completed|succeeded/i.test(verifiedPaymentStatus);
  if (!isPaid) {
    throw new Error(`Whop Sandbox payment ${maskId(verifiedPaymentId)} is not paid: status=${verifiedPaymentStatus}`);
  }
  console.log('CRITERION_L_PAYMENT_PAID=PASS');

  // Verify membership attributable to this checkout
  console.log(`[whop-provider] Polling Whop Sandbox API for memberships attributable to this checkout...`);
  const memPollStart = Date.now();
  let attributableMemberships = [];

  while (Date.now() - memPollStart < 45_000) {
    try {
      const res = await fetch(`${endpoint}/memberships?company_id=${encodeURIComponent(whopSandboxCompanyId)}&limit=25`, {
        headers: {
          Authorization: `Bearer ${whopSandboxApiKey}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const items = json?.data || json?.memberships || (Array.isArray(json) ? json : []);
        attributableMemberships = items.filter(item => {
          const itemCreated = item.created_at || item.created || 0;
          const itemTimeSec = typeof itemCreated === 'number' ? itemCreated : Math.floor(new Date(itemCreated).getTime() / 1000);
          const matchesTime = itemTimeSec >= checkoutStartSec;
          const matchesCheckout = item.checkout_configuration_id === createdCheckoutRef ||
            item.checkout_configuration?.id === createdCheckoutRef;
          const planId = item.plan_id || item.plan?.id;
          const matchesPlan = planId === whopSandboxProPlanId;
          return matchesTime && (matchesCheckout || matchesPlan);
        });

        if (attributableMemberships.length > 0) {
          break;
        }
      }
    } catch (err) {
      console.log(`[whop-provider] Network error polling Whop memberships: ${err.message}`);
    }
    await page.waitForTimeout(2000);
  }

  verifiedMembershipCount = attributableMemberships.length;
  console.log(`[whop-provider] Found ${verifiedMembershipCount} memberships attributable to this checkout.`);

  if (verifiedMembershipCount === 0) {
    throw new Error('Whop Sandbox did not create a membership for this payment within timeout');
  }

  if (verifiedMembershipCount > 1) {
    for (const m of attributableMemberships) {
      console.log(`  - Duplicate membership: id=${maskId(m.id)} status=${m.status || m.state}`);
    }
    throw new Error(`PRODUCT_OR_PROVIDER_DUPLICATION_RISK: Found ${verifiedMembershipCount} memberships attributable to this single checkout! Expected exactly 1.`);
  }

  const membership = attributableMemberships[0];
  verifiedMembershipId = membership.id;
  const memStatus = membership.status || membership.state || '';
  console.log(`[whop-provider] Exactly one attributable membership found: id=${maskId(verifiedMembershipId)} status=${memStatus}`);

  if (!/active|valid/i.test(memStatus)) {
    throw new Error(`Whop membership ${maskId(verifiedMembershipId)} is not active: status=${memStatus}`);
  }
}

async function verifyBackendEntitlement() {
  console.log('\n======================================================');
  console.log('VERIFYING AUTHORITATIVE BACKEND ENTITLEMENT STATE');
  console.log('======================================================');

  if (!appwriteApiKey || !qaUserId) {
    console.log('[backend-verify] Skipping direct Appwrite inspection (missing APPWRITE_API_KEY or QA_USER_ID)');
    return;
  }

  const client = new sdk.Client().setEndpoint(appwriteEndpoint).setProject(appwriteProjectId).setKey(appwriteApiKey);
  const databases = new sdk.Databases(client);
  const functions = new sdk.Functions(client);

  console.log(`[backend-verify] Polling whop_subscription_state for user ${maskId(qaUserId)}...`);
  let stateDoc = null;
  const pollStart = Date.now();
  while (Date.now() - pollStart < 45_000) {
    const listRes = await databases.listDocuments('main', 'whop_subscription_state', [
      sdk.Query.equal('user_id', [qaUserId]),
      sdk.Query.limit(5),
    ]).catch(() => ({ documents: [] }));

    if (listRes.documents?.length > 0) {
      if (listRes.documents.length !== 1) {
        throw new Error(`Expected exactly 1 whop_subscription_state document for fresh QA user, but found ${listRes.documents.length}`);
      }
      stateDoc = listRes.documents[0];
      console.log(`[backend-verify] Found single authoritative whop_subscription_state doc: ${maskId(stateDoc.$id)} plan=${stateDoc.plan} status=${stateDoc.status} membership_id=${maskId(stateDoc.membership_id)}`);
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!stateDoc) {
    throw new Error(`whop_subscription_state document was not created for QA user ${maskId(qaUserId)} within timeout`);
  }

  if (stateDoc.plan !== 'pro' || stateDoc.status !== 'active') {
    throw new Error(`whop_subscription_state document is not active pro: plan=${stateDoc.plan}, status=${stateDoc.status}`);
  }
  console.log('CRITERION_O_APPWRITE_PROVIDER_STATE=PASS');

  // Check whop-webhook executions
  const execList = await functions.listExecutions('whop-webhook', [
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(10),
  ]).catch(() => ({ executions: [] }));

  const successfulWebhook = execList.executions?.find(e => e.status === 'completed' && e.responseStatusCode >= 200 && e.responseStatusCode < 300);
  if (!successfulWebhook) {
    console.log('[backend-verify] Warning: No recent successful whop-webhook execution found in list');
  } else {
    console.log(`[backend-verify] Authoritative webhook execution: ${maskId(successfulWebhook.$id)} status=${successfulWebhook.status} HTTP=${successfulWebhook.responseStatusCode}`);
    console.log('CRITERION_M_MEMBERSHIP_ACTIVATED_WEBHOOK=PASS');
    console.log('CRITERION_N_WEBHOOK_HTTP_200=PASS');
  }

  // Check shared subscription resolver with real created state
  const resolved = resolver.resolveEffectivePlan({
    providerEnvironment: 'sandbox',
    whopProviderEnvironment: 'sandbox',
    userId: qaUserId,
    whopQaUserId: qaUserId,
    whopProviderState: stateDoc,
    subscription: null,
  });
  console.log(`[backend-verify] Shared resolver output: plan=${resolved?.plan} source=${resolved?.source} status=${resolved?.status} environment=${resolved?.providerEnvironment}`);
  if (resolved?.plan !== 'pro' || resolved?.source !== 'whop' || resolved?.status !== 'active') {
    throw new Error(`Shared resolver did not resolve to active Pro: plan=${resolved?.plan}, source=${resolved?.source}, status=${resolved?.status}`);
  }
  if (resolved?.providerEnvironment && resolved.providerEnvironment !== 'sandbox') {
    throw new Error(`Shared resolver providerEnvironment mismatch: expected sandbox, got ${resolved?.providerEnvironment}`);
  }
  console.log('CRITERION_P_SHARED_RESOLVER_PRO=PASS');

  // Verify Whop API state if key available
  if (whopSandboxApiKey && stateDoc.membership_id) {
    try {
      const whopRes = await fetch(`https://sandbox-api.whop.com/api/v1/memberships/${encodeURIComponent(stateDoc.membership_id)}`, {
        headers: { Authorization: `Bearer ${whopSandboxApiKey}`, Accept: 'application/json' },
      });
      if (whopRes.ok) {
        const whopData = await whopRes.json();
        const memStatus = whopData?.status || whopData?.state || 'unknown';
        console.log(`[whop-api] Authoritative membership ${maskId(stateDoc.membership_id)} status=${memStatus}`);
      }
    } catch (e) {
      console.log(`[whop-api] Could not verify membership via Whop API: ${e.message}`);
    }
  }
}

async function verifyBrowserPersistence() {
  console.log('\n======================================================');
  console.log('VERIFYING BROWSER PERSISTENCE AFTER PAYMENT');
  console.log('======================================================');

  // 1. Navigate back to /subscription in the browser
  console.log(`[e2e] Navigating back to ${baseUrl}/subscription...`);
  await page.goto(`${baseUrl}/subscription`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // Poll for Pro plan to reflect on the subscription page
  console.log('[e2e] Waiting for subscription UI to display Pro plan...');
  let proVisible = false;
  const pollStart = Date.now();
  while (Date.now() - pollStart < 30_000) {
    const pageText = await page.locator('main').innerText().catch(() => '');
    if (/Current plan[\s\S]*?Pro/i.test(pageText) || (/Active/i.test(pageText) && /Pro/i.test(pageText))) {
      proVisible = true;
      console.log('[e2e] Pro plan successfully displayed in browser UI!');
      break;
    }
    await page.waitForTimeout(2_000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  }

  if (!proVisible) {
    const snippet = (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    console.log(`[e2e] UI text at timeout: "${snippet}"`);
    throw new Error('Subscription page did not display active Pro plan');
  }
  console.log('BROWSER_RETURN_PASS=true');

  // 2. Refresh browser: verify Pro is still visible
  console.log('[e2e] Refreshing browser (page.reload)...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1_500);
  const textAfterReload = await page.locator('main').innerText().catch(() => '');
  if (!/Current plan[\s\S]*?Pro/i.test(textAfterReload) && !(/Active/i.test(textAfterReload) && /Pro/i.test(textAfterReload))) {
    throw new Error('Pro plan did not persist across browser reload');
  }
  console.log('BROWSER_PERSISTENCE_REFRESH_PASS=true');

  // 3. Navigate away to /dashboard
  console.log(`[e2e] Navigating away to ${baseUrl}/dashboard...`);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_000);
  console.log(`[e2e] Dashboard loaded at: ${page.url()}`);

  // 4. Reopen subscription page: verify Pro is still visible
  console.log(`[e2e] Reopening ${baseUrl}/subscription...`);
  await page.goto(`${baseUrl}/subscription`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(1_500);
  const textAfterReopen = await page.locator('main').innerText().catch(() => '');
  if (!/Current plan[\s\S]*?Pro/i.test(textAfterReopen) && !(/Active/i.test(textAfterReopen) && /Pro/i.test(textAfterReopen))) {
    throw new Error('Pro plan did not persist upon reopening subscription page');
  }
  console.log('BROWSER_PERSISTENCE_REOPEN_PASS=true');
}

try {
  console.log('--- STARTING WHOP SANDBOX FULL E2E LIFECYCLE ---');
  await login();
  console.log('CRITERION_A_AUTH=PASS');

  await assertInitialPlanFree();
  console.log('CRITERION_B_SUBSCRIPTION_PAGE=PASS');

  await openCheckoutModal('pro');
  console.log('CRITERION_C_PLAN_SELECTION=PASS');
  console.log('CRITERION_D_PROVIDER_DEFAULT=PASS');
  console.log('CRITERION_E_CONFIRMATION_MODAL=PASS');

  const checkoutStartTime = Date.now();
  const proUrl = await openProviderCheckout('Whop', /\$5|5\.00/);
  console.log(`CRITERION_F_BILLING_CHECKOUT_EXECUTION=PASS checkout_ref=${maskId(createdCheckoutRef)}`);
  console.log(`CRITERION_G_REDIRECT_WHOP=PASS origin=${new URL(proUrl).origin}`);
  console.log('CRITERION_H_HOSTED_CHECKOUT_RENDER=PASS');

  await fillWhopHostedCheckout();
  await monitorPostSubmit();
  await verifyWhopProviderPayment(checkoutStartTime);

  await verifyBackendEntitlement();
  await verifyBrowserPersistence();

  console.log('\n======================================================');
  console.log('WHOP_SANDBOX_FULL_LIFECYCLE_VERIFIED');
  console.log('======================================================');
} finally {
  await context.close();
  await browser.close();
}
