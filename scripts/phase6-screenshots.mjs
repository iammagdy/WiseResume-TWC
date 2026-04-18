/**
 * Phase 6 verification capture script.
 *
 * Captures the 12-shot landing matrix (WiseResume + WiseHire × light + dark
 * × hero / mid / post) and emits TTFB, FCP, LCP for each variant.
 *
 * Usage:
 *   PREVIEW_URL=http://127.0.0.1:5000 \
 *   CHROME_PATH=/path/to/chromium \
 *   node scripts/phase6-screenshots.mjs
 *
 * Env:
 *   PREVIEW_URL  Base URL of the running app (default: http://localhost:5000).
 *                Use 127.0.0.1 if localhost resolution is slow in your sandbox.
 *   CHROME_PATH  Absolute path to a Chromium / Chrome binary. On Replit the
 *                latest ungoogled-chromium in /nix/store works:
 *                  ls /nix/store/[hash]-ungoogled-chromium-[ver]/bin/chromium | sort -V | tail -1
 *
 * Output:
 *   screenshots/{wiseresume,wisehire}-{light,dark}-{hero,mid,post}.jpg
 *   stdout: JSON metrics array (TTFB, FCP, LCP per product/theme)
 */
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';

const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const BASE = process.env.PREVIEW_URL || 'http://localhost:5000';

const VARIANTS = [
  { product: 'wiseresume', url: '/', mode: 'jobseeker' },
  { product: 'wisehire',   url: '/?for=companies', mode: 'wisehire' },
];
const THEMES = ['light', 'dark'];
const POSITIONS = [
  { name: 'hero',     scrollPct: 0 },
  { name: 'mid',      scrollPct: 0.45 },
  { name: 'post',     scrollPct: 0.85 },
  { name: 'footer',   scrollPct: 1.0 },
];

async function captureMetrics(page) {
  return await page.evaluate(() => new Promise(resolve => {
    const result = { fcp: null, lcp: null, ttfb: null };
    try {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) result.ttfb = navEntry.responseStart - navEntry.requestStart;
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) result.fcp = fcpEntry.startTime;
    } catch {}
    let lcpVal = null;
    try {
      const po = new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length) lcpVal = entries[entries.length - 1].startTime;
      });
      po.observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => { po.disconnect(); result.lcp = lcpVal; resolve(result); }, 1500);
    } catch { resolve(result); }
  }));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    executablePath: process.env.CHROME_PATH || undefined,
  });
  const report = [];

  for (const variant of VARIANTS) {
    for (const theme of THEMES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
      const t0 = Date.now();
      await page.goto(`${BASE}${variant.url}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const loadMs = Date.now() - t0;
      // Wait for landing root + give animations a beat
      await page.waitForSelector('.lp-root', { timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));

      // Verify theme is correct by reading body data attr
      const scheme = await page.evaluate(() => document.body.dataset.lpScheme || 'light');
      const metrics = await captureMetrics(page);

      for (const pos of POSITIONS) {
        await page.evaluate(pct => {
          const h = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: h * pct, behavior: 'instant' });
        }, pos.scrollPct);
        await new Promise(r => setTimeout(r, 900));
        const file = `${OUT}/${variant.product}-${theme}-${pos.name}.jpg`;
        await page.screenshot({ path: file, type: 'jpeg', quality: 85, fullPage: false });
        console.log(`saved ${file}`);
      }

      report.push({ product: variant.product, theme, scheme, loadMs, ...metrics });
      await page.close();
    }
  }

  await browser.close();
  console.log('\n=== METRICS ===');
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
