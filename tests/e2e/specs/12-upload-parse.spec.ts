import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';
import path from 'node:path';

const FIXTURE = path.resolve('tests/e2e/fixtures/sample-resume.pdf');

test('Upload → parse-resume edge function returns a parsed structure', async ({ page }) => {
  const obs = attachObservers(page);

  // Wait for the parse-resume edge call from the upload page
  const parsePromise = page.waitForResponse(
    res => /\/api\/fn\/parse-resume|\/functions\/v1\/parse-resume/.test(res.url()),
    { timeout: 90_000 },
  );

  await page.goto('/upload');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput, '/upload must expose a file input').toHaveCount(1);
  await fileInput.setInputFiles(FIXTURE);

  // Some uploaders need an explicit submit click after file selection
  const submit = page.getByRole('button', { name: /upload|parse|submit|continue|import/i }).first();
  if (await submit.count()) await submit.click().catch(() => null);

  const parseRes = await parsePromise;
  test.info().annotations.push({ type: 'parse-resume-status', description: String(parseRes.status()) });
  expect(parseRes.ok(), `parse-resume returned ${parseRes.status()}`).toBe(true);

  // Body must be non-empty and look like a parsed resume payload
  const body = await parseRes.text();
  expect(body.length, 'parse-resume body should be non-empty').toBeGreaterThan(20);
  const lower = body.toLowerCase();
  // Heuristic: should mention at least one structured key the UI consumes
  const looksStructured = /name|email|experience|skills|summary|education|sections|content/.test(lower);
  expect(looksStructured, `parse-resume body did not look structured: ${body.slice(0, 200)}`).toBe(true);

  test.info().annotations.push({
    type: 'parse-resume-snippet',
    description: body.slice(0, 600),
  });
  test.info().annotations.push({ type: 'edge-fn', description: JSON.stringify(obs.edgeFnCalls.slice(0, 20)) });
});
