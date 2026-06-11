'use strict';

/**
 * One-off: raise ai-gateway execution timeout so tailor-resume (28s/provider)
 * is not killed by Appwrite's default 30s limit.
 */
const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv(f) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...r] = t.split('=');
    if (!process.env[k]) process.env[k] = r.join('=').replace(/^['"]|['"]$/g, '');
  }
}
loadEnv('.env.deploy');
loadEnv('.env');

const TARGET_TIMEOUT = 180;
const FUNCTION_ID = 'ai-gateway';

const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);
const functions = new sdk.Functions(client);

(async () => {
  const current = await functions.get(FUNCTION_ID);
  if ((current.timeout ?? 0) >= TARGET_TIMEOUT) {
    console.log(`ai-gateway timeout already ${current.timeout}s — no change needed`);
    return;
  }
  await functions.update({
    functionId: FUNCTION_ID,
    name: current.name,
    runtime: current.runtime,
    execute: current.execute,
    events: current.events || [],
    schedule: current.schedule || '',
    timeout: TARGET_TIMEOUT,
    enabled: current.enabled ?? true,
    logging: current.logging ?? true,
    entrypoint: current.entrypoint || 'src/main.js',
    commands: current.commands || '',
    scopes: current.scopes || [],
    installationId: current.installationId || '',
    providerRepositoryId: current.providerRepositoryId || '',
    providerBranch: current.providerBranch || '',
    providerSilentMode: current.providerSilentMode ?? false,
    providerRootDirectory: current.providerRootDirectory || '',
  });
  const updated = await functions.get(FUNCTION_ID);
  console.log(`ai-gateway timeout updated: ${current.timeout}s → ${updated.timeout}s`);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
