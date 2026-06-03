#!/usr/bin/env node
/**
 * Compute SHA-256 source hashes for all Appwrite hub main.js files.
 * Writes src/lib/devkit/sourceHashes.generated.json which the DevKit
 * imports to detect whether each hub needs redeployment.
 *
 * Run: node scripts/compute-source-hashes.mjs
 * Or add to package.json prebuild to keep in sync automatically.
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const outPath = join(ROOT, 'src', 'lib', 'devkit', 'sourceHashes.generated.json');

// All hubs that the DevKit Appwrite Functions console tracks
const HUBS = [
  'ai-gateway',
  'admin-devkit-data',
  'admin-email',
  'inspect-ai-keys',
  'admin-deploy-hubs',
  'admin-feature-flags',
  'admin-impersonate',
  'admin-moderation',
  'admin-onboarding-funnel',
  'admin-portfolio-usernames',
  'admin-sentry',
  'admin-testmail',
  'admin-visitor-analytics',
  'ai-health',
  'coupons',
  'email-service',
  'email-templates',
  'job-import',
  'public-share',
  'resume-section-ai',
  'wisehire-gateway',
];

const hashes = {};
for (const hub of HUBS) {
  const mainPath = join(ROOT, 'appwrite-hubs', hub, 'src', 'main.js');
  if (existsSync(mainPath)) {
    const content = readFileSync(mainPath, 'utf8').replace(/\r\n/g, '\n');
    hashes[hub] = createHash('sha256').update(content).digest('hex').slice(0, 16);
  } else {
    hashes[hub] = null;
  }
}

let generatedAt = new Date().toISOString();
if (existsSync(outPath)) {
  try {
    const previous = JSON.parse(readFileSync(outPath, 'utf8'));
    const previousHashes = previous?.hashes ?? {};
    if (JSON.stringify(previousHashes) === JSON.stringify(hashes) && typeof previous?.generatedAt === 'string') {
      generatedAt = previous.generatedAt;
    }
  } catch {
    // Ignore parse failures and write a fresh manifest.
  }
}

const out = { generatedAt, hashes };
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

console.log(`[compute-source-hashes] Written to ${outPath.replace(ROOT, '.')}`);
for (const [hub, hash] of Object.entries(hashes)) {
  console.log(`  ${hub}: ${hash ?? '(not found)'}`);
}
