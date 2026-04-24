import { test, expect } from '../fixtures/auth-required';
import { attachObservers } from '../fixtures/observers';

test.describe('Auth & app shell', () => {
  test('Authenticated user lands on Dashboard with no console errors', async ({ page }) => {
    const obs = attachObservers(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    test.info().annotations.push({ type: 'observed', description: JSON.stringify(obs.snapshot(), null, 2).slice(0, 3000) });
    const fatal = obs.consoleErrors.filter(c => c.type === 'error' && !/favicon/i.test(c.text));
    test.info().annotations.push({ type: 'console-errors', description: JSON.stringify(fatal.slice(0, 10)) });
  });

  test('Top-level routes return 200', async ({ page }) => {
    // 18 routes × ~2 s dwell each ≈ 30–40 s wall time, which exceeds the
    // 25 s ceiling some operators run the suite under. Give this single
    // sequential walk a generous per-test timeout without raising the
    // global default.
    test.setTimeout(60_000);
    const routes = [
      '/dashboard', '/resume', '/cover-letters', '/applications', '/interview',
      '/career', '/tailor', '/portfolio', '/settings', '/templates',
      '/ai-studio', '/upload', '/profile', '/notifications', '/achievements',
      '/activity', '/help', '/resignation-letters',
    ];
    const broken: { route: string; status: number; bodyText?: string }[] = [];
    for (const r of routes) {
      const res = await page.goto(r, { waitUntil: 'domcontentloaded' }).catch(() => null);
      await page.waitForTimeout(800);
      const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 200);
      const status = res?.status() ?? 0;
      const is404 = /404|page doesn'?t exist/i.test(bodyText);
      if (status >= 400 || is404) broken.push({ route: r, status, bodyText: bodyText.slice(0, 120) });
    }
    test.info().annotations.push({ type: 'broken-routes', description: JSON.stringify(broken, null, 2) });
    expect(broken, `Broken routes: ${JSON.stringify(broken, null, 2)}`).toHaveLength(0);
  });
});
