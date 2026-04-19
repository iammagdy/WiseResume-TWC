/**
 * Kinde Dashboard Branding Automation
 * Logs into the Kinde dashboard and applies brand colors + logo.
 *
 * Usage:
 *   node scripts/apply-kinde-branding.mjs             # WiseResume (default)
 *   node scripts/apply-kinde-branding.mjs --wisehire  # WiseHire blue brand
 *
 * Required env vars:
 *   KINDE_DASHBOARD_EMAIL    — Kinde dashboard login email
 *   KINDE_DASHBOARD_PASSWORD — Kinde dashboard login password
 *
 * NOTE — Email template body text:
 *   Kinde's email template editor uses a rich-text interface that is not
 *   reliably automatable via Puppeteer. After running this script, update
 *   the verification email body manually in the Kinde dashboard:
 *
 *   For WiseHire:
 *     Dashboard → Emails → Templates → "Verify email"
 *     - Change sender display name to "WiseHire"
 *     - Replace "WiseResume" with "WiseHire" in the body text
 *     - Update the button colour to #1D4ED8 (Kinde calls this "Button colour")
 *
 *   For WiseResume:
 *     - Sender: "WiseResume"
 *     - Button colour: #9D211B
 */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KINDE_EMAIL = process.env.KINDE_DASHBOARD_EMAIL;
const KINDE_PASSWORD = process.env.KINDE_DASHBOARD_PASSWORD;
const KINDE_BUSINESS_DOMAIN = 'thewisecloud';

const isWiseHire = process.argv.includes('--wisehire');

// ── Brand presets ──────────────────────────────────────────────────────────────

const BRAND_WISEHIRE = {
  name: 'WiseHire',
  buttonColor: '#1D4ED8',    // WiseHire blue-700
  linkColor: '#1D4ED8',
  buttonTextColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  buttonColorDark: '#3B82F6', // blue-500 for dark mode
  linkColorDark: '#3B82F6',
  logoLightPath: path.resolve(__dirname, '../public/favicon-wisehire.png'),
  logoDarkPath:  path.resolve(__dirname, '../public/favicon-wisehire.png'),
  faviconPath:   path.resolve(__dirname, '../public/favicon-wisehire.png'),
};

const BRAND_WISERERESUME = {
  name: 'WiseResume',
  buttonColor: '#9D211B',    // Crimson Red (HSL 357 71% 36%)
  linkColor: '#9D211B',
  buttonTextColor: '#FFFFFF',
  backgroundColor: '#FFFFFF',
  buttonColorDark: '#E54B51',
  linkColorDark: '#E54B51',
  logoLightPath: path.resolve(__dirname, '../public/logo-light.png'),
  logoDarkPath:  path.resolve(__dirname, '../public/logo-dark.png'),
  faviconPath:   path.resolve(__dirname, '../public/favicon.png'),
};

const BRAND = isWiseHire ? BRAND_WISEHIRE : BRAND_WISERERESUME;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function setColorInput(page, labelText, hexColor) {
  const handle = await page.evaluateHandle((label) => {
    const labels = Array.from(document.querySelectorAll('label, [class*="label"]'));
    const found = labels.find(l => l.textContent.toLowerCase().includes(label.toLowerCase()));
    if (!found) return null;
    const id = found.getAttribute('for');
    if (id) return document.getElementById(id);
    return found.nextElementSibling?.querySelector('input') || found.querySelector('input');
  }, labelText);

  if (!handle || !(await handle.asElement())) {
    console.log(`  ⚠️  Could not find input for "${labelText}"`);
    return false;
  }

  const input = handle.asElement();
  await input.click({ clickCount: 3 });
  await input.type(hexColor);
  await sleep(300);
  console.log(`  ✅ Set "${labelText}" → ${hexColor}`);
  return true;
}

async function uploadFile(page, labelText, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filePath}`);
    return false;
  }

  const fileInput = await page.evaluateHandle((label) => {
    const labels = Array.from(document.querySelectorAll('label'));
    const found = labels.find(l => l.textContent.toLowerCase().includes(label.toLowerCase()));
    if (!found) return null;
    const id = found.getAttribute('for');
    if (id) return document.getElementById(id);
    return found.closest('[class*="upload"]')?.querySelector('input[type="file"]')
      || document.querySelector('input[type="file"]');
  }, labelText);

  const el = fileInput?.asElement ? fileInput.asElement() : null;
  if (el) {
    await el.uploadFile(filePath);
    await sleep(500);
    console.log(`  ✅ Uploaded "${labelText}" → ${path.basename(filePath)}`);
    return true;
  }

  // Fallback: use the first visible file input
  const inputs = await page.$$('input[type="file"]');
  if (inputs.length > 0) {
    await inputs[0].uploadFile(filePath);
    await sleep(500);
    console.log(`  ✅ Uploaded logo → ${path.basename(filePath)} (fallback)`);
    return true;
  }

  console.log(`  ⚠️  Could not find file input for "${labelText}"`);
  return false;
}

async function clickSave(page) {
  const saved = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find(b =>
      b.textContent.toLowerCase().includes('save') ||
      b.textContent.toLowerCase().includes('apply') ||
      b.textContent.toLowerCase().includes('update')
    );
    if (saveBtn) { saveBtn.click(); return true; }
    return false;
  });
  if (saved) {
    console.log('  ✅ Clicked Save');
    await sleep(1500);
  } else {
    console.log('  ⚠️  No Save button found — please save manually');
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  if (!KINDE_EMAIL || !KINDE_PASSWORD) {
    console.error('❌ Missing KINDE_DASHBOARD_EMAIL or KINDE_DASHBOARD_PASSWORD env vars');
    process.exit(1);
  }

  console.log(`🚀 Applying ${BRAND.name} branding to Kinde…`);
  if (isWiseHire) {
    console.log('   Mode: WiseHire (blue #1D4ED8)');
    console.log('   ℹ️  After this script finishes, update the email template body text');
    console.log('      manually: Dashboard → Emails → Templates → "Verify email"');
    console.log('      Replace all mentions of "WiseResume" with "WiseHire" and set');
    console.log('      the sender display name to "WiseHire".');
  } else {
    console.log('   Mode: WiseResume (crimson #9D211B)');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // ── Step 1: Log into Kinde dashboard ──────────────────────────────────────
    console.log('\n📋 Step 1: Logging into Kinde dashboard...');
    await page.goto('https://app.kinde.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    await page.waitForSelector('input[type="email"], input[name="email"], input[id*="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"], input[id*="email"]', KINDE_EMAIL);
    await sleep(300);

    const emailBtn = await page.$('button[type="submit"]');
    if (emailBtn) await emailBtn.click();
    await sleep(1500);

    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', KINDE_PASSWORD);
    await sleep(300);

    const pwBtn = await page.$('button[type="submit"]');
    if (pwBtn) await pwBtn.click();

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('  ✅ Logged in. Current URL:', page.url());

    // ── Step 2: Navigate to the design/theme page ──────────────────────────────
    console.log(`\n📋 Step 2: Opening ${BRAND.name} theme settings…`);
    const businessUrl = `https://app.kinde.com/${KINDE_BUSINESS_DOMAIN}/design/theme`;
    await page.goto(businessUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    console.log('  Current URL:', page.url());

    // ── Step 3: Set light mode colors ─────────────────────────────────────────
    console.log('\n📋 Step 3: Setting light mode brand colors...');
    await setColorInput(page, 'button color', BRAND.buttonColor);
    await setColorInput(page, 'link color', BRAND.linkColor);
    await setColorInput(page, 'button text', BRAND.buttonTextColor);
    await setColorInput(page, 'background', BRAND.backgroundColor);

    // ── Step 4: Upload logo ────────────────────────────────────────────────────
    console.log('\n📋 Step 4: Uploading logo...');
    await uploadFile(page, 'logo', BRAND.logoLightPath);

    // ── Step 5: Save ───────────────────────────────────────────────────────────
    console.log('\n📋 Step 5: Saving changes...');
    await clickSave(page);

    // Screenshot for verification
    const screenshotPath = `/tmp/kinde-branding-${BRAND.name.toLowerCase()}-result.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved to ${screenshotPath}`);

    console.log(`\n✅ ${BRAND.name} branding applied!`);
    console.log('   Button color:', BRAND.buttonColor);
    console.log('   Link color:  ', BRAND.linkColor);
    console.log('   Background:  ', BRAND.backgroundColor);

    if (isWiseHire) {
      console.log('\n⚠️  Manual follow-up required for email template:');
      console.log('   1. Go to: Kinde Dashboard → Emails → Templates → "Verify email"');
      console.log('   2. Change sender display name from "WiseResume" to "WiseHire"');
      console.log('   3. Replace "WiseResume" with "WiseHire" in the body text');
      console.log('   4. Ensure button colour is #1D4ED8 (WiseHire blue)');
      console.log('   5. Save the template');
    }

  } catch (err) {
    console.error('\n❌ Error during automation:', err.message);
    await page.screenshot({ path: '/tmp/kinde-error.png', fullPage: true });
    console.log('Error screenshot saved to /tmp/kinde-error.png');
  } finally {
    await browser.close();
  }
})();
