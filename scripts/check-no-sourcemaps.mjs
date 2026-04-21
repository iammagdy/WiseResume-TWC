#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const allowMaps = !!process.env.SENTRY_AUTH_TOKEN;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.map')) out.push(p);
  }
  return out;
}

const maps = walk(DIST);

if (allowMaps) {
  console.log(
    `[check-no-sourcemaps] SENTRY_AUTH_TOKEN is set; ${maps.length} *.map file(s) found in ${DIST}/ ` +
      `(expected — they will be uploaded to Sentry and then deleted by sentryVitePlugin.filesToDeleteAfterUpload).`
  );
  process.exit(0);
}

if (maps.length > 0) {
  console.error(
    `\n[check-no-sourcemaps] FAIL: ${maps.length} sourcemap file(s) found in ${DIST}/ but SENTRY_AUTH_TOKEN is not set.\n` +
      `These files would expose your original source code if uploaded to Hostinger. ` +
      `Either set SENTRY_AUTH_TOKEN (so they get uploaded + deleted), or fix vite.config.ts so no maps are generated.\n\n` +
      `Offending files (first 10):\n` +
      maps.slice(0, 10).map((p) => `  - ${p}`).join('\n') +
      '\n'
  );
  process.exit(1);
}

console.log(`[check-no-sourcemaps] OK: no *.map files in ${DIST}/.`);
