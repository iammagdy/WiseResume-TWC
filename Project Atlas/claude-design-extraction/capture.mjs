/**
 * WiseResume Screenshot Extraction Pack
 * Captures real UI screenshots from the running local dev server.
 *
 * Usage:
 *   node "Project Atlas/claude-design-extraction/capture.mjs"
 *
 * Requirements:
 *   - Dev server running at http://localhost:5000 (npm run dev in Y:\WiseResume-TWC)
 *   - Playwright already installed (confirmed)
 *
 * Read-only — does not touch app code, backend, or deployments.
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:5000';

const DESKTOP = { width: 1440, height: 1100 };
const MOBILE  = { width: 390,  height: 844 };

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[capture] ${msg}`); }
function logSection(msg) { console.log(`\n${'─'.repeat(60)}\n[capture] ${msg}\n${'─'.repeat(60)}`); }

async function serverReady(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, resolve);
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return false;
}

async function waitForNoSkeleton(page, timeoutMs = 12000) {
  try {
    await page.waitForFunction(() => {
      const skeletons = document.querySelectorAll(
        '[data-testid*="skeleton"], .animate-pulse, [class*="skeleton"], [class*="Skeleton"]'
      );
      return skeletons.length === 0;
    }, { timeout: timeoutMs });
  } catch {
    // proceed if timeout — page may be using custom loaders
  }
  await page.waitForTimeout(600);
}

async function shot(page, filename, extraWait = 0) {
  if (extraWait) await page.waitForTimeout(extraWait);
  await waitForNoSkeleton(page);
  const outPath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  const sizeKB = Math.round(fs.statSync(outPath).size / 1024);
  log(`Saved: ${filename} (${sizeKB} KB)`);
  return outPath;
}

async function navigateAndWait(page, url, waitMs = 2500) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(waitMs);
  await waitForNoSkeleton(page);
}

// ── Auth detection ────────────────────────────────────────────────────────────

async function ensureLoggedIn(page) {
  await page.goto(BASE_URL + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2500);

  const url = page.url();
  const onAuth = url.includes('/auth') || url.includes('/login') || url.includes('/signin');

  if (!onAuth) {
    log('Already logged in — proceeding.');
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('ACTION REQUIRED: Please log in to WiseResume in the browser window.');
  console.log('The script will automatically continue once login is detected.');
  console.log('═'.repeat(60) + '\n');

  await page.waitForFunction(
    () => !window.location.href.includes('/auth') && !window.location.href.includes('/login'),
    { timeout: 180000, polling: 1000 }
  );
  await page.waitForTimeout(2500);
  log('Login detected — continuing.');
}

// ── Navigate to editor via dashboard click ────────────────────────────────────

async function openEditorFromDashboard(page) {
  log('Navigating to dashboard to open editor...');
  await navigateAndWait(page, BASE_URL + '/dashboard', 3500);

  // Try to click the "Edit" button on the first resume card
  try {
    // Wait for resume cards to appear
    await page.waitForSelector('[class*="resume"], [class*="Resume"], [data-testid*="resume"]', { timeout: 8000 });
    await page.waitForTimeout(1000);

    // Find and click the first "Edit" button in a resume card
    const editBtn = await page.getByRole('button', { name: /^edit$/i }).first();
    if (editBtn) {
      await editBtn.click();
      await page.waitForURL('**/editor**', { timeout: 10000 });
      await page.waitForTimeout(4000);
      await waitForNoSkeleton(page, 10000);
      log('Navigated to editor via card Edit button.');
      return true;
    }
  } catch (e) {
    log(`Could not click Edit button: ${e.message}`);
  }

  // Fallback: try clicking any resume card directly
  try {
    const card = await page.$('[class*="ResumeListCard"], [class*="resume-card"], article');
    if (card) {
      await card.click();
      await page.waitForTimeout(3000);
      const url = page.url();
      if (url.includes('/editor') || url.includes('/resume/')) {
        log(`Navigated to ${url} by clicking card.`);
        return true;
      }
    }
  } catch (e) {
    log(`Card click fallback: ${e.message}`);
  }

  // Last fallback: just go to /editor directly (will use whatever Zustand has)
  log('Falling back to direct /editor navigation.');
  await navigateAndWait(page, BASE_URL + '/editor', 4000);
  return false;
}

// ── Find tailoring result URL ─────────────────────────────────────────────────

async function findTailoringResultUrl(page) {
  // Scan current page for any tailoring result link
  try {
    const href = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/tailoring-hub/result"]'));
      return links[0]?.getAttribute('href') || null;
    });
    if (href) return href.startsWith('http') ? href : BASE_URL + href;
  } catch {/* ignore */}
  return null;
}

// ── Try to open a sheet/dialog by button text ─────────────────────────────────

async function tryOpenSheet(page, patterns, screenshotFile, afterClose = true) {
  for (const pattern of patterns) {
    try {
      let trigger;
      if (typeof pattern === 'string') {
        trigger = await page.$(pattern);
      } else {
        trigger = await page.getByRole('button', { name: pattern }).first().elementHandle().catch(() => null);
      }
      if (trigger) {
        await trigger.click();
        await page.waitForTimeout(2000);
        await waitForNoSkeleton(page, 6000);
        await shot(page, screenshotFile);
        if (afterClose) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(600);
        }
        return true;
      }
    } catch {/* try next */}
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  logSection('WiseResume Screenshot Extraction Pack');

  // 1. Check dev server
  log(`Checking dev server at ${BASE_URL} ...`);
  if (!await serverReady(BASE_URL)) {
    console.error(`\n[capture] ERROR: Dev server is NOT running at ${BASE_URL}`);
    console.error('[capture] Please run:  npm run dev   in Y:\\WiseResume-TWC');
    console.error('[capture] Then re-run this script.\n');
    process.exit(1);
  }
  log('Dev server is up.');

  // 2. Launch visible browser (non-headless so user can log in if needed)
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ['--window-size=1460,1150'],
  });

  // Start with desktop context
  const ctx = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    logSection('Step 1 of 5: Authentication');
    await ensureLoggedIn(page);

    // ── Desktop screenshots ───────────────────────────────────────────────
    logSection('Step 2 of 5: Desktop screenshots (1440×1100)');

    // 01 — Dashboard desktop
    await navigateAndWait(page, BASE_URL + '/dashboard', 3500);
    await shot(page, '01-dashboard-desktop.png');

    // 03 — Settings desktop
    await navigateAndWait(page, BASE_URL + '/settings', 2500);
    await shot(page, '03-settings-desktop.png');

    // 05 — Editor desktop (navigate via dashboard card click)
    await openEditorFromDashboard(page);
    await shot(page, '05-editor-desktop.png');

    // 11 — AI Enhance popup (from editor)
    log('Trying to open AI Improve Summary / Enhance panel...');
    const aiOpened = await tryOpenSheet(page, [
      // Common patterns for AI enhance triggers
      '[data-testid="ai-enhance-btn"]',
      '[aria-label*="Improve Summary"]',
      '[aria-label*="Enhance"]',
      '[aria-label*="AI Improve"]',
      'button:has-text("Improve Summary")',
      'button:has-text("AI Enhance")',
      'button:has-text("Enhance Summary")',
      'button:has-text("Improve")',
    ], '11-ai-enhance-popup-summary.png');

    if (!aiOpened) {
      // Try nav rail items — look for AI-related icons/buttons in the editor sidebar
      log('Trying nav rail for AI tools...');
      const navBtns = await page.$$('aside button, nav button, [role="navigation"] button');
      let found = false;
      for (const btn of navBtns) {
        const label = await btn.getAttribute('aria-label').catch(() => '');
        const text  = await btn.textContent().catch(() => '');
        const combined = (label + text).toLowerCase();
        if (combined.includes('ai') || combined.includes('improve') || combined.includes('enhance')) {
          await btn.click();
          await page.waitForTimeout(2000);
          await waitForNoSkeleton(page, 6000);
          await shot(page, '11-ai-enhance-popup-summary.png');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          found = true;
          break;
        }
      }
      if (!found) {
        log('AI enhance not auto-reachable — taking current editor state for 11.');
        await shot(page, '11-ai-enhance-popup-summary.png');
      }
    }

    // 12 — AI output sheet (the "result" state after AI returns)
    // Stay in editor, re-open same sheet if possible, else use current state
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
    log('Attempting AI output/result state for 12...');
    const aiOutputOpened = await tryOpenSheet(page, [
      '[data-testid="ai-result-sheet"]',
      '[data-testid="ai-output-sheet"]',
      'button:has-text("Review AI")',
      'button:has-text("AI Result")',
      'button:has-text("View Result")',
      'button:has-text("AI Suggestions")',
      'button:has-text("Suggestions")',
    ], '12-ai-output-sheet.png');
    if (!aiOutputOpened) {
      log('AI output state not auto-reachable — taking current state for 12.');
      await shot(page, '12-ai-output-sheet.png');
    }

    // 13 — Export popup
    log('Opening export dialog...');
    const exportOpened = await tryOpenSheet(page, [
      '[data-testid="export-btn"]',
      '[aria-label*="Export"]',
      '[aria-label*="Download"]',
      'button:has-text("Export")',
      'button:has-text("Download")',
      'button:has-text("Save PDF")',
      'button:has-text("PDF")',
    ], '13-export-popup.png');
    if (!exportOpened) {
      // Try from toolbar area
      try {
        await page.getByRole('button', { name: /export|download|pdf/i }).first().click();
        await page.waitForTimeout(2000);
        await waitForNoSkeleton(page);
        await shot(page, '13-export-popup.png');
        await page.keyboard.press('Escape');
      } catch {
        log('Export dialog not found — taking current state for 13.');
        await shot(page, '13-export-popup.png');
      }
    }

    // 14 — Import Job popup (from dashboard)
    await navigateAndWait(page, BASE_URL + '/dashboard', 2500);
    log('Looking for Import Job / Paste Job trigger...');
    const importOpened = await tryOpenSheet(page, [
      '[data-testid="import-job-btn"]',
      '[data-testid="paste-job-btn"]',
      '[aria-label*="Import Job"]',
      '[aria-label*="Paste Job"]',
      'button:has-text("Import Job")',
      'button:has-text("Paste Job")',
      'button:has-text("Add Job")',
      'button:has-text("Import")',
    ], '14-import-job-popup.png');
    if (!importOpened) {
      // Try from tailoring hub
      await navigateAndWait(page, BASE_URL + '/tailoring-hub', 2500);
      const importFromTailor = await tryOpenSheet(page, [
        'button:has-text("Import Job")',
        'button:has-text("Paste")',
        '[placeholder*="job"]',
        '[aria-label*="Import"]',
      ], '14-import-job-popup.png');
      if (!importFromTailor) {
        log('Import job dialog not auto-reachable — taking tailoring hub state for 14.');
        await shot(page, '14-import-job-popup.png');
      }
    }

    // 07 — Tailoring Hub desktop
    await navigateAndWait(page, BASE_URL + '/tailoring-hub', 2500);
    await shot(page, '07-tailoring-hub-desktop.png');

    // 09 — Tailoring Result desktop (check for links on dashboard first)
    await navigateAndWait(page, BASE_URL + '/dashboard', 2000);
    let resultUrl = await findTailoringResultUrl(page);
    if (!resultUrl) {
      // Try tailoring hub page for recent results
      await navigateAndWait(page, BASE_URL + '/tailoring-hub', 2000);
      resultUrl = await findTailoringResultUrl(page);
    }
    if (resultUrl) {
      await navigateAndWait(page, resultUrl, 3500);
      await shot(page, '09-tailoring-result-desktop.png');
    } else {
      log('No tailoring result URL found — tailoring hub used as placeholder for 09.');
      await navigateAndWait(page, BASE_URL + '/tailoring-hub', 2000);
      await shot(page, '09-tailoring-result-desktop.png');
    }

    // ── Mobile screenshots ────────────────────────────────────────────────
    logSection('Step 3 of 5: Mobile screenshots (390×844)');
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(600);

    // 02 — Dashboard mobile
    await navigateAndWait(page, BASE_URL + '/dashboard', 3500);
    await shot(page, '02-dashboard-mobile.png');

    // 04 — Settings mobile
    await navigateAndWait(page, BASE_URL + '/settings', 2500);
    await shot(page, '04-settings-mobile.png');

    // 06 — Editor mobile (reuse Zustand state from earlier click)
    await openEditorFromDashboard(page);
    await shot(page, '06-editor-mobile.png');

    // 08 — Tailoring Hub mobile
    await navigateAndWait(page, BASE_URL + '/tailoring-hub', 2500);
    await shot(page, '08-tailoring-hub-mobile.png');

    // 10 — Tailoring Result mobile
    if (resultUrl) {
      await navigateAndWait(page, resultUrl, 3500);
      await shot(page, '10-tailoring-result-mobile.png');
    } else {
      await navigateAndWait(page, BASE_URL + '/tailoring-hub', 2000);
      await shot(page, '10-tailoring-result-mobile.png');
    }

    // ── Verify ────────────────────────────────────────────────────────────
    logSection('Step 4 of 5: Verifying captured files');
    const expected = [
      '01-dashboard-desktop.png', '02-dashboard-mobile.png',
      '03-settings-desktop.png',  '04-settings-mobile.png',
      '05-editor-desktop.png',    '06-editor-mobile.png',
      '07-tailoring-hub-desktop.png', '08-tailoring-hub-mobile.png',
      '09-tailoring-result-desktop.png', '10-tailoring-result-mobile.png',
      '11-ai-enhance-popup-summary.png', '12-ai-output-sheet.png',
      '13-export-popup.png', '14-import-job-popup.png',
    ];
    let allGood = true;
    for (const f of expected) {
      const p = path.join(SCREENSHOTS_DIR, f);
      const exists = fs.existsSync(p);
      const sizeKB = exists ? Math.round(fs.statSync(p).size / 1024) : 0;
      const status = !exists ? '✗ MISSING' : sizeKB < 30 ? `⚠ TINY (${sizeKB}KB — may be placeholder)` : `✓ ${sizeKB}KB`;
      console.log(`  ${status}  ${f}`);
      if (!exists) allGood = false;
    }

    logSection('Step 5 of 5: Done');
    log(`Screenshots saved to:\n  ${SCREENSHOTS_DIR}`);
    if (!allGood) log('WARNING: Some screenshots are missing. Check output above.');

  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error('[capture] Fatal error:', e);
  process.exit(1);
});
