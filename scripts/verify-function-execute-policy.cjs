'use strict';

const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');
const {
  FUNCTION_EXECUTION_POLICIES,
  assertFunctionPolicyCoverage,
} = require('./appwrite-function-policy.cjs');

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
  }
}

function sameRoles(actual, intended) {
  return actual.length === intended.length && actual.every(role => intended.includes(role));
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env.deploy');

  const policyIds = Object.keys(FUNCTION_EXECUTION_POLICIES);
  assertFunctionPolicyCoverage(policyIds);

  if (!process.env.APPWRITE_API_KEY) {
    throw new Error('APPWRITE_API_KEY is required for read-only live permission verification.');
  }

  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
    .setKey(process.env.APPWRITE_API_KEY);
  const response = await new sdk.Functions(client).list({ queries: [sdk.Query.limit(100)] });
  const liveById = new Map(response.functions.map(fn => [fn.$id, fn]));
  const missing = [];
  const mismatched = [];

  for (const hubId of policyIds) {
    const liveId = hubId === 'admin-sentry' ? '6a0760710000ff231048' : hubId;
    const live = liveById.get(liveId);
    if (!live) {
      missing.push(hubId);
      console.log(`${hubId}: MISSING`);
      continue;
    }
    const intended = [...FUNCTION_EXECUTION_POLICIES[hubId].execute];
    const actual = Array.isArray(live.execute) ? [...live.execute] : [];
    const matches = sameRoles(actual, intended);
    if (!matches) mismatched.push(hubId);
    console.log(
      `${hubId}: ${matches ? 'MATCH' : 'MISMATCH'} actual=[${actual.join(',')}] intended=[${intended.join(',')}] schedule=${live.schedule || '(none)'}`,
    );
  }

  const jobSync = liveById.get('job-feed-sync');
  if (!jobSync || jobSync.schedule !== '0 */6 * * *') {
    throw new Error('job-feed-sync schedule does not match the required 0 */6 * * * schedule.');
  }

  console.log(`Summary: live=${response.functions.length} missing=${missing.length} mismatched=${mismatched.length}`);
  if (process.argv.includes('--enforce') && (missing.length || mismatched.length)) process.exit(1);
}

main().catch(error => {
  console.error(`Function permission verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
