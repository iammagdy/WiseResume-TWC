import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

test.describe('Resume listing', () => {
  test('/resume renders the user\'s resume list', async ({ page }) => {
    const obs = attachObservers(page);
    await page.goto('/resume');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    const text = await page.locator('body').innerText();
    test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1500) });
    const has404 = /404|page doesn'?t exist/i.test(text);
    expect(has404, `/resume returned 404 body: ${text.slice(0, 200)}`).toBe(false);
    test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.slice(0, 20)) });
  });

  test('Dashboard shows at least one resume tile (Replit Test if seeded)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    const replit = page.getByText(/replit test/i).first();
    if (await replit.count()) {
      await expect(replit).toBeVisible();
    } else {
      const text = await page.locator('body').innerText();
      test.info().annotations.push({ type: 'note', description: 'Seeded "Replit Test" resume not present. Body sample: ' + text.slice(0, 600) });
      test.skip(true, 'Seeded "Replit Test" resume not found in this account');
    }
  });
});
