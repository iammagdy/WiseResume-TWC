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

    page.on('requestfailed', request => {
      console.log(`[Request Failed] URL: ${request.url()} | Error: ${request.failure()?.errorText}`);
    });

    page.on('response', response => {
      const url = response.url();
      if (url.endsWith('.js') || url.includes('/assets/')) {
        console.log(`[JS Loaded] URL: ${url} | Status: ${response.status()}`);
      }
      if (response.status() >= 400) {
        console.log(`[Bad Response] URL: ${url} | Status: ${response.status()}`);
      }
    });

    console.log('[E2E Test] Navigating to home to set localStorage debug flag...');
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('wiseresume-debug', 'true');
    });

    console.log('[E2E Test] Navigating to public portfolio: https://wiseresume.app/p/magdy');
    await page.goto('/p/magdy');
    await page.waitForLoadState('domcontentloaded');

    const debugFlag = await page.evaluate(() => localStorage.getItem('wiseresume-debug'));
    console.log(`[E2E Test] wiseresume-debug value on /p/magdy: ${debugFlag}`);

    console.log('[E2E Test] Waiting for "I\'m Interested" button to be visible...');
    const interestBtn = page.locator('button[data-track="portfolio-interested"]');
    await expect(interestBtn).toBeVisible({ timeout: 15000 });

    console.log('[E2E Test] Waiting 5 seconds for early tracking ping...');
    await page.waitForTimeout(5000);

    console.log('[E2E Test] Clicking the "I\'m Interested" button...');
    await interestBtn.click();

    console.log('[E2E Test] Waiting 8 seconds for interest API to complete...');
    await page.waitForTimeout(8000);

    // Print all captured console logs
    console.log('[E2E Test] --- ALL CAPTURED BROWSER CONSOLE LOGS ---');
    consoleLogs.forEach((log, index) => {
      console.log(`  ${index + 1}: ${log}`);
    });
    console.log('[E2E Test] -----------------------------------------');

    // Verify early ping console output
    const hasMountLog = consoleLogs.some(log => log.includes('[portfolio-tracking]') && log.includes('Hook effect mounted'));
    const hasEarlyPingSent = consoleLogs.some(log => log.includes('[portfolio-tracking]') && log.includes('Sending 4-second early ping'));
    const hasEarlyPingSuccess = consoleLogs.some(log => log.includes('[portfolio-tracking]') && log.includes('Early ping created visitDocId'));

    // Verify interest click console output
    const hasInterestTrigger = consoleLogs.some(log => log.includes('[pf-interest]') && log.includes('handleInterest triggered'));
    const hasInterestSuccess = consoleLogs.some(log => log.includes('[pf-interest]') && log.includes('sendPortfolioInterest result: ok=true'));

    console.log('[E2E Test] Asserting early tracking logs:');
    console.log(`  - Hook Mount Log Found: ${hasMountLog}`);
    console.log(`  - Sending Early Ping Log Found: ${hasEarlyPingSent}`);
    console.log(`  - Early Ping Success Log Found: ${hasEarlyPingSuccess}`);
    console.log(`  - Interest Trigger Log Found: ${hasInterestTrigger}`);
    console.log(`  - Interest Success Log Found: ${hasInterestSuccess}`);

    expect(hasMountLog).toBe(true);
    expect(hasEarlyPingSent).toBe(true);
    expect(hasEarlyPingSuccess).toBe(true);
    expect(hasInterestTrigger).toBe(true);
    expect(hasInterestSuccess).toBe(true);
  });
});
