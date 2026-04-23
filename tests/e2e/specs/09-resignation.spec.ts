import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

test('/resignation-letters list page', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/resignation-letters');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1000) });
});

test('/resignation-letter/new opens generator', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/resignation-letter/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1000) });
});
