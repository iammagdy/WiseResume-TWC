#!/usr/bin/env node
// Ensure Puppeteer's bundled Chrome is installed in ~/.cache/puppeteer.
//
// Why this script exists:
//   The npm `puppeteer` package normally downloads Chrome during its own
//   postinstall, but in some environments (Replit container imports, CI with
//   --ignore-scripts, fresh clones, cache wipes) that download is skipped or
//   the cache is empty. When Chrome is missing the server's PDF export route
//   throws "Could not find Chrome" and the user sees "Failed to generate PDF".
//
//   Running this from our own postinstall makes the install explicit and
//   self-healing. It is a no-op when Chrome is already present.
//
// Skip mechanisms (set any to skip):
//   - PUPPETEER_SKIP_DOWNLOAD=1   (standard puppeteer convention)
//   - SKIP_PUPPETEER_CHROME=1     (project-local override)
//   - PUPPETEER_EXECUTABLE_PATH=… (caller is providing their own Chrome)

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SKIP =
  process.env.PUPPETEER_SKIP_DOWNLOAD === '1' ||
  process.env.PUPPETEER_SKIP_DOWNLOAD === 'true' ||
  process.env.SKIP_PUPPETEER_CHROME === '1' ||
  !!process.env.PUPPETEER_EXECUTABLE_PATH;

if (SKIP) {
  console.log('[ensure-puppeteer-chrome] skipped (env override set)');
  process.exit(0);
}

const cacheDir = process.env.PUPPETEER_CACHE_DIR || join(homedir(), '.cache', 'puppeteer');
const chromeDir = join(cacheDir, 'chrome');

function alreadyInstalled() {
  if (!existsSync(chromeDir)) return false;
  try {
    const versions = readdirSync(chromeDir).filter((d) => d.startsWith('linux-'));
    return versions.some((v) => existsSync(join(chromeDir, v, 'chrome-linux64', 'chrome')));
  } catch {
    return false;
  }
}

if (alreadyInstalled()) {
  console.log('[ensure-puppeteer-chrome] Chrome already present in', chromeDir);
  process.exit(0);
}

console.log('[ensure-puppeteer-chrome] installing Chrome for Puppeteer…');
const result = spawnSync('npx', ['puppeteer', 'browsers', 'install', 'chrome'], {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  console.warn(
    '[ensure-puppeteer-chrome] install exited with code',
    result.status,
    '— PDF generation may fail until Chrome is installed manually with `npx puppeteer browsers install chrome`',
  );
  // Do NOT fail the install; let the rest of the project come up.
  process.exit(0);
}

console.log('[ensure-puppeteer-chrome] done');
