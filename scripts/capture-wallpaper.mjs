import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const BASE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : 'http://localhost:5000';

const WALLPAPER_URL = `${BASE_URL}/wallpaper`;
const OUT_PATH = path.join(ROOT, 'wallpaper-kinde.png');

console.log(`Capturing ${WALLPAPER_URL} …`);

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--use-gl=angle',
    '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox',
    '--force-dark-mode',
  ],
});

try {
  const page = await browser.newPage();

  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: 'dark' },
  ]);

  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  await page.goto(WALLPAPER_URL, { waitUntil: 'networkidle0', timeout: 30000 });

  await page.waitForSelector('#wallpaper-root', { timeout: 15000 });

  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({
    path: OUT_PATH,
    type: 'png',
    clip: { x: 0, y: 0, width: 1920, height: 1080 },
    fullPage: false,
  });

  console.log(`Saved: ${OUT_PATH}`);
} finally {
  await browser.close();
}
