#!/usr/bin/env node
/**
 * Local PDF export API (Puppeteer). Default port 5003 avoids clashing with
 * another Vite instance often bound to 5001 in this repo's worktrees.
 *
 * Pair with: VITE_DEV_API_PORT=5003 npm run dev
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.API_PORT || '5001';

const child = spawn('node', ['dist/server.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, API_PORT: port },
});

child.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
