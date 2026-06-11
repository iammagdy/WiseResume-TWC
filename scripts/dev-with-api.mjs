#!/usr/bin/env node
/**
 * Run Vite and the Puppeteer PDF API together for local development.
 * PDF export from the tailoring dialog (and editor) requires the API on :5001.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(label, args) {
  const child = spawn(npmCmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[dev-with-api] ${label} exited with code ${code}`);
  });
  return child;
}

const pdfServer = run('pdf-server', ['run', 'dev:pdf-server']);
const vite = run('vite', ['run', 'dev']);

function shutdown() {
  pdfServer.kill('SIGINT');
  vite.kill('SIGINT');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

pdfServer.on('exit', () => vite.kill('SIGTERM'));
vite.on('exit', () => pdfServer.kill('SIGTERM'));
