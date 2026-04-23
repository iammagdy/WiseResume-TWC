import { test, expect } from '../fixtures/auth-required';
import { attachObservers, DEMO_JOB_DESCRIPTION } from '../fixtures/observers';

test('Tailor page (/tailor) loads and accepts a job description', async ({ page }) => {
  const obs = attachObservers(page);
  await page.goto('/tailor');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  const text = await page.locator('body').innerText();
  test.info().annotations.push({ type: 'page-text', description: text.slice(0, 1000) });
  expect(/404|doesn'?t exist/i.test(text)).toBe(false);

  const ta = page.locator('textarea').first();
  if (await ta.count()) {
    await ta.fill(DEMO_JOB_DESCRIPTION);
    const run = page.getByRole('button', { name: /analyze|run|tailor|score|continue|submit/i }).first();
    if (await run.count()) {
      await run.click();
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => null);
    }
  }
  const failures = obs.networkErrors.filter(e => /tailor-resume|tailor-section|score-resume|analyze-resume|parse-job/.test(e.url));
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls) });
  test.info().annotations.push({ type: 'failures', description: JSON.stringify(failures) });
});
