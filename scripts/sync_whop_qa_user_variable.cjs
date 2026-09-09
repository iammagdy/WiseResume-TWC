'use strict';

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

const TARGET_HUBS = ['billing-checkout', 'ai-gateway', 'coupons'];
const VARIABLE_KEY = 'WHOP_SANDBOX_QA_USER_ID';
const RESTORE_STATE_FILE = path.join(process.cwd(), '.temp_qa_user_restore.json');

function mask(value) {
  if (value && typeof value === 'string' && value.trim()) {
    process.stdout.write(`::add-mask::${value.trim()}\n`);
  }
}

function getAppwriteClient() {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY is required to synchronize QA user variable');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return new sdk.Functions(client);
}

async function captureAndApply(functions, targetQaUserId) {
  if (!targetQaUserId) {
    throw new Error('TARGET_QA_USER_ID is required for capture-and-apply');
  }
  mask(targetQaUserId);

  console.log(`[qa-vars] Capturing previous ${VARIABLE_KEY} across ${TARGET_HUBS.join(', ')}...`);
  const previousState = {};

  for (const fnId of TARGET_HUBS) {
    const listRes = await functions.listVariables(fnId, [sdk.Query.limit(100)]);
    const existing = (listRes.variables || []).find(v => v.key === VARIABLE_KEY);

    if (existing) {
      mask(existing.value);
      previousState[fnId] = {
        exists: true,
        varId: existing.$id,
        previousValue: existing.value,
      };

      if (existing.value !== targetQaUserId) {
        await functions.updateVariable(fnId, existing.$id, VARIABLE_KEY, targetQaUserId, false);
        console.log(`[qa-vars] Updated ${VARIABLE_KEY} on ${fnId} (secret=false)`);
      } else {
        console.log(`[qa-vars] ${VARIABLE_KEY} on ${fnId} already set to target QA user`);
      }
    } else {
      previousState[fnId] = {
        exists: false,
        varId: null,
        previousValue: null,
      };
      const created = await functions.createVariable(fnId, sdk.ID.unique(), VARIABLE_KEY, targetQaUserId, false);
      previousState[fnId].varId = created.$id;
      console.log(`[qa-vars] Created ${VARIABLE_KEY} on ${fnId} (secret=false)`);
    }
  }

  fs.writeFileSync(RESTORE_STATE_FILE, JSON.stringify(previousState, null, 2), 'utf8');
  console.log('[qa-vars] Successfully saved previous state for restoration; NO code deployment occurred.');
}

async function restore(functions, tempQaUserId) {
  mask(tempQaUserId);

  if (!fs.existsSync(RESTORE_STATE_FILE)) {
    console.log(`[qa-vars] No ephemeral restore record found at ${RESTORE_STATE_FILE}; skipping restore.`);
    return;
  }

  const raw = fs.readFileSync(RESTORE_STATE_FILE, 'utf8');
  let state = {};
  try {
    state = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[qa-vars] Failed to parse restore record: ${err.message}`);
  }

  console.log(`[qa-vars] Restoring previous ${VARIABLE_KEY} on ${TARGET_HUBS.join(', ')}...`);

  for (const fnId of TARGET_HUBS) {
    const entry = state[fnId];
    if (!entry) continue;

    mask(entry.previousValue);

    const listRes = await functions.listVariables(fnId, [sdk.Query.limit(100)]);
    const current = (listRes.variables || []).find(v => v.key === VARIABLE_KEY);

    if (entry.exists && entry.previousValue) {
      if (current) {
        await functions.updateVariable(fnId, current.$id, VARIABLE_KEY, entry.previousValue, false);
      } else {
        await functions.createVariable(fnId, sdk.ID.unique(), VARIABLE_KEY, entry.previousValue, false);
      }
      console.log(`[qa-vars] Restored ${VARIABLE_KEY} on ${fnId}`);
    } else {
      if (current) {
        await functions.deleteVariable(fnId, current.$id);
        console.log(`[qa-vars] Deleted temporary ${VARIABLE_KEY} from ${fnId}`);
      }
    }

    // Readback verification
    const freshRes = await functions.listVariables(fnId, [sdk.Query.limit(100)]);
    const verified = (freshRes.variables || []).find(v => v.key === VARIABLE_KEY);

    if (entry.exists && entry.previousValue) {
      if (!verified || verified.value !== entry.previousValue) {
        throw new Error(`[qa-vars] Restore verification failed on ${fnId}: active value does not match previous state`);
      }
      if (tempQaUserId && verified.value === tempQaUserId) {
        throw new Error(`[qa-vars] Restore verification failed on ${fnId}: variable still points to temporary QA user`);
      }
    } else {
      if (verified) {
        throw new Error(`[qa-vars] Restore verification failed on ${fnId}: variable should not exist`);
      }
    }
    console.log(`[qa-vars] Verified restore on ${fnId}: variable successfully reverted`);
  }

  try {
    fs.unlinkSync(RESTORE_STATE_FILE);
  } catch (_) {}
  console.log('[qa-vars] All hubs restored successfully; ephemeral restore record removed.');
}

async function main() {
  const action = process.argv[2];
  const targetQaUserId = String(process.env.TARGET_QA_USER_ID || process.argv[3] || '').trim();

  if (!['capture-and-apply', 'restore'].includes(action)) {
    console.error('Usage: node scripts/sync_whop_qa_user_variable.cjs <capture-and-apply|restore>');
    process.exit(1);
  }

  const functions = getAppwriteClient();

  if (action === 'capture-and-apply') {
    await captureAndApply(functions, targetQaUserId);
  } else if (action === 'restore') {
    await restore(functions, targetQaUserId);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[qa-vars] Error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  TARGET_HUBS,
  VARIABLE_KEY,
  RESTORE_STATE_FILE,
  captureAndApply,
  restore,
};
