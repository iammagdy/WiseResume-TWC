import { test, expect } from '@playwright/test';

test.describe('Production Portfolio Tracing & Diagnostics Verification', () => {
  test.use({
    baseURL: 'https://wiseresume.app',
    storageState: { cookies: [], origins: [] },
  });

  test('Public portfolio triggers early visit tracking ping and handles interest clicks with correlation IDs', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      console.log(`[Browser Console] [${msg.type()}] ${text}`);
    });

    console.log('[E2E Test] Navigating to home to set localStorage debug flag...');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('wiseresume-debug', 'true');
    });

    console.log('[E2E Test] Navigating to public portfolio: https://wiseresume.app/p/magdy');
    await page.goto('/p/magdy');
    await page.waitForLoadState('domcontentloaded');

    console.log('[E2E Test] Waiting for "I\'m Interested" button to be visible...');
    const interestBtn = page.locator('button[data-track="portfolio-interested"]');
    await expect(interestBtn).toBeVisible({ timeout: 15000 });

    console.log('[E2E Test] Waiting 6 seconds for early tracking ping...');
    await page.waitForTimeout(6000);

    // Verify early ping console output
    const hasMountLog = consoleLogs.some(log => log.includes('[portfolio-tracking]') && log.includes('Hook effect mounted'));
    const hasEarlyPingSent = consoleLogs.some(log => log.includes('[portfolio-tracking]') && log.includes('Sending 4-second early ping'));
    const hasEarlyPingSuccess = consoleLogs.some(log => log.includes('[portfolio-tracking]') && log.includes('Early ping created visitDocId'));

    console.log('[E2E Test] Asserting early tracking logs:');
    console.log(`  - Hook Mount Log Found: ${hasMountLog}`);
    console.log(`  - Sending Early Ping Log Found: ${hasEarlyPingSent}`);
    console.log(`  - Early Ping Success Log Found: ${hasEarlyPingSuccess}`);

    expect(hasMountLog).toBe(true);
    expect(hasEarlyPingSent).toBe(true);
    expect(hasEarlyPingSuccess).toBe(true);
  });
});
