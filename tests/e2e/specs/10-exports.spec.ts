import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

test('Templates page and template gallery loads', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/templates');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1200) });
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.slice(0, 20)) });
});

test('Editor route loads (no resume id)', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/editor');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1200) });
});
