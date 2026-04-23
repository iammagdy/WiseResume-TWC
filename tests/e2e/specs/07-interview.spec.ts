import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

test('/interview page renders', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/interview');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1500) });
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.slice(0, 20)) });
});
