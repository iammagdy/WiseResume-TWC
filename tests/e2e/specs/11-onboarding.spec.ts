import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

test('Onboarding flow renders', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/onboarding');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1200) });
  const fatal = obs.consoleErrors.filter(c => c.type === 'error');
  test.info().annotations.push({ type: 'console', description: JSON.stringify(fatal.slice(0, 10)) });
});

test('Upload (parse-resume) page renders', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/upload');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1200) });
});
