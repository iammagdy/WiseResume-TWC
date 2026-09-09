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

page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' || /whop|stripe|checkout|error|payment/i.test(text)) {
    console.log(`[browser ${msg.type()}] ${text.slice(0, 300)}`);
  }
});
page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));

page.on('response', async (response) => {
  const resUrl = response.url();
  if (/whop\.com|stripe|basis|payment/i.test(resUrl)) {
    if (response.status() >= 400 || /checkout|confirm|pay|intent|order|membership/i.test(resUrl)) {
      let bodySnippet = '';
      try {
        const text = await response.text();
        bodySnippet = text.slice(0, 200).replace(/\s+/g, ' ');
      } catch (_) {}
      console.log(`[network] ${response.status()} ${response.request().method()} ${resUrl.split('?')[0]} ${bodySnippet ? `body=${bodySnippet}` : ''}`);
    }
  }

  if (!/\/functions\//i.test(response.url())) return;
  const requestUrl = response.url();
  const functionName = requestUrl.match(/functions\/([^/]+)/i)?.[1] || 'unknown';
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
    shape = `state=${typeof data?.state === 'string' ? data.state : 'none'} provider=${typeof data?.provider === 'string' ? data.provider : 'none'} plan=${typeof data?.plan === 'string' ? data.plan : 'none'} checkout=${Boolean(checkoutUrl)} origin=${checkoutUrl ? new URL(checkoutUrl).origin : 'none'}`;
    if (payload?.errors) {
      console.log(`BILLING_CHECKOUT_EXECUTION_ERRORS=${String(payload.errors).replace(/\s+/g, ' ').slice(0, 500)}`);
    }
    if (payload?.logs) {
      console.log(`BILLING_CHECKOUT_EXECUTION_LOGS=${String(payload.logs).replace(/\s+/g, ' ').slice(0, 500)}`);
    }
  } catch {}
  console.log(`BILLING_CHECKOUT_RESPONSE status=${status} code=${code || 'none'} ${shape}`);
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
    const alert = page.getByRole('alert').first();
    if (await alert.isVisible().catch(() => false)) {
      const message = (await alert.innerText()).replace(/\s+/g, ' ').trim().slice(0, 120);
      console.log(`${provider.toUpperCase()}_CHECKOUT_UI_ERROR=${message}`);
    }
    throw new Error(`${provider.toUpperCase()}_CHECKOUT_NAVIGATION_FAILED`);
  }
  if (provider === 'Whop' && new URL(page.url()).hostname !== 'sandbox.whop.com') throw new Error('WHOP_SANDBOX_PAYMENT_ENVIRONMENT_GUARD_FAILURE');
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

async function firstVisibleFrameLocator(selector, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const frame of page.frames()) {
      try {
        const locator = frame.locator(selector).first();
        if (await locator.isVisible()) return locator;
      } catch (_) {}
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function dumpFrameState(label = 'debug') {
  console.log(`--- [e2e:${label}] Current URL: ${page.url()} ---`);
  for (let i = 0; i < page.frames().length; i++) {
    const frame = page.frames()[i];
    try {
      const inputs = await frame.locator('input, select, textarea').all();
      for (const inp of inputs) {
        if (await inp.isVisible().catch(() => false)) {
          const type = await inp.getAttribute('type').catch(() => '');
          const name = await inp.getAttribute('name').catch(() => '');
          const autocomplete = await inp.getAttribute('autocomplete').catch(() => '');
          const placeholder = await inp.getAttribute('placeholder').catch(() => '');
          const required = (await inp.getAttribute('required').catch(() => null)) !== null;
          const val = await inp.inputValue().catch(() => '');
          console.log(`[frame ${i} input] type="${type}" name="${name}" auto="${autocomplete}" ph="${placeholder}" req=${required} val="${type === 'password' ? '***' : val}"`);
        }
      }
      const buttons = await frame.locator('button, [role="button"], input[type="submit"]').all();
      for (const btn of buttons) {
        if (await btn.isVisible().catch(() => false)) {
          const text = (await btn.innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
          const type = await btn.getAttribute('type').catch(() => '');
          const role = await btn.getAttribute('role').catch(() => '');
          const disabled = await btn.isDisabled().catch(() => false);
          const ariaDisabled = (await btn.getAttribute('aria-disabled').catch(() => '')) === 'true';
          console.log(`[frame ${i} button] text="${text.slice(0, 60)}" type="${type}" role="${role}" disabled=${disabled || ariaDisabled}`);
        }
      }
    } catch (_) {}
  }
}

async function findSubmitButton(timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (let i = 0; i < page.frames().length; i++) {
      const frame = page.frames()[i];
      try {
        const buttons = await frame.locator('button, [role="button"], input[type="submit"]').all();
        const candidates = [];
        for (const btn of buttons) {
          if (await btn.isVisible().catch(() => false)) {
            const rawText = await btn.innerText().catch(() => '');
            const text = (rawText || '').trim();
            const rawType = await btn.getAttribute('type').catch(() => '');
            const type = (rawType || '').toLowerCase();
            const rawRole = await btn.getAttribute('role').catch(() => '');
            const role = (rawRole || '').toLowerCase();
            const disabled = await btn.isDisabled().catch(() => false);
            const ariaDisabled = ((await btn.getAttribute('aria-disabled').catch(() => '')) || '').toLowerCase() === 'true';
            candidates.push({ locator: btn, text, type, role, disabled: disabled || ariaDisabled, frameIndex: i });
          }
        }

        // Exclude buttons that are non-submission actions
        const nonAction = candidates.filter(c =>
          !/apply|coupon|promo|discount|cancel|back|terms|privacy|close|sign in|log in/i.test(c.text)
        );

        // Priority 1: explicitly mentions Pay / Subscribe / Join / Purchase / Start
        const explicitAction = nonAction.find(c =>
          /\$|pay|subscribe|complete\s*purchase|join\s*membership|join|start/i.test(c.text)
        );
        if (explicitAction) {
          return explicitAction;
        }

        // Priority 2: submit button that is not promo/apply
        const submitBtn = nonAction.find(c => c.type === 'submit');
        if (submitBtn) {
          return submitBtn;
        }

        // Priority 3: other primary checkout action
        const fallbackBtn = nonAction.find(c => /continue|checkout|complete/i.test(c.text));
        if (fallbackBtn) {
          return fallbackBtn;
        }
      } catch (err) {
        console.log(`[e2e] Error in findSubmitButton frame ${i}: ${err.message}`);
      }
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function fillAllVisible(selector, value) {
  for (const frame of page.frames()) {
    try {
      const locators = await frame.locator(selector).all();
      for (const loc of locators) {
        if (await loc.isVisible().catch(() => false)) {
          const val = (await loc.inputValue().catch(() => '')).trim();
          if (!val) {
            console.log(`[e2e] Filling matching input (${selector}) with "${value}"...`);
            await loc.fill(value);
          }
        }
      }
    } catch (_) {}
  }
}

try {
  await login();
  await assertSubscriptionSurface();
  await openCheckoutModal('pro');

  const proUrl = await openProviderCheckout('Whop', /\$5|5\.00/);
  console.log(`WHOP_PRO_CHECKOUT_OPEN=true origin=${new URL(proUrl).origin}`);

  // 1. Email (if guest customer email prompt is shown)
  await fillAllVisible('input[type="email"], input[name="email"]', email);

  // 2. Name (fills both contact name and billing name if present)
  await fillAllVisible('input[name="name"][type="text"], input[placeholder="Name"]', 'WiseResume QA');

  // 3. Address Line 1 (fills both contact and billing address line 1)
  await fillAllVisible('input[name="line1"][type="text"], input[placeholder*="Address line 1" i]', '123 Main St');

  // 4. City
  await fillAllVisible('input[name="city"][type="text"], input[placeholder*="City" i]', 'New York');

  // 5. Postal / ZIP code
  await fillAllVisible('input[name="zip"][type="text"], input[placeholder*="ZIP" i], input[autocomplete="postal-code"]', '10001');

  // 6. Card Details (inside provider frames)
  const cardField = await firstVisibleFrameLocator('input[autocomplete="cc-number"], input[name*="card" i]');
  if (!cardField) throw new Error('Whop Sandbox card field was not available');
  await cardField.fill(testCard);
  const expiryField = await firstVisibleFrameLocator('input[autocomplete="cc-exp"], input[name*="exp" i]');
  const cvcField = await firstVisibleFrameLocator('input[autocomplete="cc-csc"], input[name*="cvc" i], input[name*="cvv" i]');
  if (!expiryField || !cvcField) throw new Error('Whop Sandbox expiry/CVC fields were not available');
  await expiryField.fill(testExpiry);
  await cvcField.fill(testCvc);
  await cvcField.press('Tab').catch(() => {});

  // 7. Check required checkboxes if unchecked
  for (const frame of page.frames()) {
    try {
      const requiredBoxes = await frame.locator('input[type="checkbox"][required], input[type="checkbox"][aria-required="true"]').all();
      for (const box of requiredBoxes) {
        if (await box.isVisible().catch(() => false) && !(await box.isChecked().catch(() => true))) {
          console.log('[e2e] Checking required checkbox...');
          await box.check({ force: true }).catch(() => {});
        }
      }
    } catch (_) {}
  }

  // 8. General fallback for ANY remaining empty required input across all frames
  for (const frame of page.frames()) {
    try {
      const requiredInputs = await frame.locator('input[required]').all();
      for (const inp of requiredInputs) {
        if (await inp.isVisible().catch(() => false)) {
          const val = (await inp.inputValue().catch(() => '')).trim();
          if (!val) {
            const ph = (await inp.getAttribute('placeholder').catch(() => '') || '').toLowerCase();
            const name = (await inp.getAttribute('name').catch(() => '') || '').toLowerCase();
            console.log(`[e2e] Catch-all: filling required empty input: name="${name}" ph="${ph}"`);
            if (/name/i.test(name) || /name/i.test(ph)) await inp.fill('WiseResume QA');
            else if (/line|address/i.test(name) || /address/i.test(ph)) await inp.fill('123 Main St');
            else if (/city/i.test(name) || /city/i.test(ph)) await inp.fill('New York');
            else if (/zip|postal/i.test(name) || /zip|postal/i.test(ph)) await inp.fill('10001');
            else if (/state/i.test(name) || /state/i.test(ph)) await inp.fill('NY');
            else await inp.fill('Test');
          }
        }
      }
    } catch (_) {}
  }

  // Ensure no combobox is open and blur
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(1_000);

  await dumpFrameState('form-filled');

  await page.waitForTimeout(1_000);
  const submitCandidate = await findSubmitButton(15_000);
  if (!submitCandidate) {
    await dumpFrameState('missing-submit-button');
    throw new Error('Whop Sandbox submit button was not available');
  }

  console.log(`[e2e] Selected submit button: text="${submitCandidate.text}" type="${submitCandidate.type}" role="${submitCandidate.role}" disabled=${submitCandidate.disabled} frame=${submitCandidate.frameIndex}`);

  // If disabled, wait up to 10s for card validation to complete and enable the button
  if (submitCandidate.disabled) {
    console.log('[e2e] Submit button is currently disabled, waiting up to 10s for validation to enable it...');
    const enableStart = Date.now();
    while (Date.now() - enableStart < 10_000) {
      const stillDisabled = (await submitCandidate.locator.isDisabled().catch(() => true)) ||
        ((await submitCandidate.locator.getAttribute('aria-disabled').catch(() => '')) === 'true');
      if (!stillDisabled) {
        console.log('[e2e] Submit button is now enabled!');
        break;
      }
      await page.waitForTimeout(500);
    }
  }

  await submitCandidate.locator.click();
  console.log('[e2e] Submit button clicked. Monitoring post-submit state...');

  const postSubmitStart = Date.now();
  let paymentSubmitted = false;
  let clickCount = 1;

  while (Date.now() - postSubmitStart < 45_000) {
    const currentUrl = page.url();

    // Check if navigated away from Whop Sandbox
    if (!/sandbox\.whop\.com/i.test(currentUrl)) {
      console.log(`[e2e] Successfully navigated away from Whop Sandbox to: ${currentUrl}`);
      paymentSubmitted = true;
      break;
    }

    // Check for inline error alerts
    for (const frame of page.frames()) {
      try {
        const errorElements = await frame.locator('[role="alert"], .error, [class*="error" i], [aria-invalid="true"]').all();
        for (const err of errorElements) {
          if (await err.isVisible().catch(() => false)) {
            const errText = (await err.innerText().catch(() => '')).trim();
            if (errText) console.log(`[e2e] Visible form/page error: "${errText.replace(/\s+/g, ' ')}"`);
          }
        }
      } catch (_) {}
    }

    // Check for post-payment confirmation screen on Whop Sandbox
    const pageBody = await page.locator('body').innerText().catch(() => '');
    const isConfirmation = /order confirmed|thank you|payment successful|you['’]re in|membership active|success|receipt/i.test(pageBody) ||
      /\/orders\/|\/confirmation|\/success|\/thank-you|\/hub/i.test(currentUrl);

    if (isConfirmation) {
      console.log(`[e2e] Whop post-payment confirmation screen detected on ${currentUrl}`);
      paymentSubmitted = true;

      // Look for a return or continue button/link to return to WiseResume
      for (const frame of page.frames()) {
        try {
          const actionElements = await frame.locator('a, button, [role="button"]').all();
          for (const el of actionElements) {
            if (await el.isVisible().catch(() => false)) {
              const elText = (await el.innerText().catch(() => '')).trim();
              const href = (await el.getAttribute('href').catch(() => '')) || '';
              if (/return|continue|go to|back to|access|wiseresume/i.test(elText) || /wiseresume\.app/i.test(href)) {
                console.log(`[e2e] Found return/continue element on confirmation screen: text="${elText}" href="${href}". Clicking...`);
                await el.click().catch(() => {});
                break;
              }
            }
          }
        } catch (_) {}
      }

      await page.waitForTimeout(3_000);
      if (!/sandbox\.whop\.com/i.test(page.url())) {
        console.log(`[e2e] Successfully returned to app: ${page.url()}`);
      }
      break;
    }

    // If after 5s the button is still visible and enabled on the checkout page, retry click
    if (Date.now() - postSubmitStart > 5_000 && clickCount < 3 && /sandbox\.whop\.com\/checkout\//i.test(currentUrl)) {
      const stillVisible = await submitCandidate.locator.isVisible().catch(() => false);
      const stillDisabled = (await submitCandidate.locator.isDisabled().catch(() => true)) ||
        ((await submitCandidate.locator.getAttribute('aria-disabled').catch(() => '')) === 'true');
      if (stillVisible && !stillDisabled) {
        console.log(`[e2e] Button still visible and enabled after ${Math.round((Date.now() - postSubmitStart) / 1000)}s, clicking again (attempt #${clickCount + 1})...`);
        await submitCandidate.locator.click().catch(() => {});
        clickCount++;
      }
    }

    await page.waitForTimeout(2_000);
  }

  if (!paymentSubmitted && /sandbox\.whop\.com/i.test(page.url())) {
    await dumpFrameState('post-submit-timeout');
    const fullBody = await page.locator('body').innerText().catch(() => '');
    console.log(`[e2e] Whop Sandbox page text at timeout:\n${fullBody.slice(0, 2000)}`);
    throw new Error('Whop Sandbox checkout did not return after payment submission');
  }

  console.log('WHOP_PRO_PAYMENT_SUBMITTED=true');
} finally {
  await context.close();
  await browser.close();
}
