import { test, expect } from '../fixtures/auth-required';
import { attachObservers, DEMO_JOB_DESCRIPTION } from '../fixtures/observers';

test('Cover letters page loads', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/cover-letters');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 800) });
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls) });
});

test('Create new cover letter (/cover-letter/new) flow surface', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/cover-letter/new');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
  const text = await page.locator('body').innerText();
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);
  const ta = page.locator('textarea').first();
  if (await ta.count()) await ta.fill(DEMO_JOB_DESCRIPTION);
  const submit = page.getByRole('button', { name: /generate|create|next|submit/i }).first();
  if (await submit.count()) {
    await submit.click().catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => null);
  }
  const failures = obs.networkErrors.filter(e => /generate-cover-letter/.test(e.url));
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls) });
  test.info().annotations.push({ type: 'failures', description: JSON.stringify(failures) });
});
