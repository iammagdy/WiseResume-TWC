import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

/**
 * Editor AI tools — opens the most-recent resume from the dashboard
 * (or skips if no resumes exist) and exercises any AI buttons that
 * are present. Records every edge-function call so the report can
 * cite real evidence.
 */

async function openFirstResume(page: Page): Promise<boolean> {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3500);
  // Look for an explicit "Replit Test" tile first
  const replit = page.getByText(/replit test/i).first();
  if (await replit.count()) {
    await replit.click();
    await page.waitForURL(/\/(editor|resume)/, { timeout: 15_000 }).catch(() => null);
    return true;
  }
  // Otherwise click the first "Edit" / "Open" affordance
  const edit = page.getByRole('button', { name: /edit|open/i }).first();
  if (await edit.count()) {
    await edit.click();
    await page.waitForURL(/\/(editor|resume)/, { timeout: 15_000 }).catch(() => null);
    return /\/(editor|resume)/.test(page.url());
  }
  return false;
}

test.describe('Editor — AI assistance', () => {
  test('Smart Fit / one-page optimizer surface', async ({ page }) => {
    const obs = attachObservers(page);
    const opened = await openFirstResume(page);
    test.skip(!opened, 'No resume could be opened from /dashboard');
    await page.waitForTimeout(2000);
    const trigger = page.getByRole('button', { name: /smart fit|fit to.*page|one.?page/i }).first();
    test.skip(!(await trigger.count()), 'Smart Fit button not present');
    await trigger.click();
    await page.waitForTimeout(1500);
    const runBtn = page.getByRole('button', { name: /run|optimize|fit|continue|apply/i }).first();
    if (await runBtn.count()) await runBtn.click().catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => null);
    const failures = obs.networkErrors.filter(e => /smart-fit|one-page-optimizer/.test(e.url));
    test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.filter(c => /smart-fit|one-page/.test(c.url))) });
    expect(failures, JSON.stringify(failures)).toHaveLength(0);
  });

  test('Score / analyze resume surface', async ({ page }) => {
    const obs = attachObservers(page);
    const opened = await openFirstResume(page);
    test.skip(!opened, 'No resume could be opened');
    await page.waitForTimeout(2000);
    const btn = page.getByRole('button', { name: /score|ats|analyze/i }).first();
    test.skip(!(await btn.count()), 'No score/analyze button visible');
    await btn.click();
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => null);
    const failures = obs.networkErrors.filter(e => /score-resume|analyze-resume/.test(e.url));
    expect(failures).toHaveLength(0);
  });
});
