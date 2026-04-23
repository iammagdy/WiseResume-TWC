import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

test('/career page loads (career coach surface)', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/career');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1200) });
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.slice(0, 20)) });
});

test('/ai-studio renders tool catalog', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/ai-studio');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1200) });
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.slice(0, 20)) });
});
