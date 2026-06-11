#!/usr/bin/env node
/**
 * Local PDF export API (Puppeteer). Default port 5001.
 *
 * Loads .env / .env.local so Appwrite vars from Vite env files reach the server.
 * Pair with: npm run dev (frontend) + npm run dev:pdf-server — or npm run dev:full
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.API_PORT || '5001';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = {
  ...loadEnvFile(join(root, '.env')),
  ...loadEnvFile(join(root, '.env.local')),
};

const mergedEnv = {
  ...process.env,
  ...fileEnv,
  API_PORT: port,
  APPWRITE_ENDPOINT:
    process.env.APPWRITE_ENDPOINT ||
    fileEnv.APPWRITE_ENDPOINT ||
    fileEnv.VITE_APPWRITE_ENDPOINT ||
    process.env.VITE_APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID:
    process.env.APPWRITE_PROJECT_ID ||
    fileEnv.APPWRITE_PROJECT_ID ||
    fileEnv.VITE_APPWRITE_PROJECT_ID ||
    process.env.VITE_APPWRITE_PROJECT_ID,
};

const child = spawn('node', ['dist/server.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: mergedEnv,
});

child.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
