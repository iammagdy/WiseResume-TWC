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

function maskId(id) {
  if (!id || typeof id !== 'string') return '[NONE]';
  if (id.length <= 8) return '***';
  return id.slice(0, 4) + '***' + id.slice(-4);
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

function generateUniqueId() {
  if (sdk && sdk.ID && typeof sdk.ID.unique === 'function') {
    return sdk.ID.unique();
  }
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function retryWithBackoff(operation, options = {}) {
  const maxAttempts = Number.isInteger(options.retries) ? options.retries : 3;
  const initialDelayMs = Number.isInteger(options.initialDelayMs) ? options.initialDelayMs : 250;
  const backoffFactor = options.backoffFactor || 2;
  let delay = initialDelayMs;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) {
        break;
      }
      // If a create operation failed, verify whether it actually succeeded remotely before retrying
      if (options.isCreate && typeof options.reCheckFn === 'function') {
        try {
          const existing = await options.reCheckFn();
          if (existing) {
            return existing;
          }
        } catch (_) {}
      }
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      delay *= backoffFactor;
    }
  }
  throw lastError;
}

async function executeRollback(functions, snapshot, mutatedHubs, options = {}) {
  const hubsToRollback = [...mutatedHubs].reverse();
  for (const fnId of hubsToRollback) {
    const entry = snapshot[fnId];
    if (!entry) continue;

    mask(entry.previousValue);

    const listRes = await retryWithBackoff(
      () => functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']),
      options
    );
    const current = (listRes.variables || []).find(v => v.key === VARIABLE_KEY);

    if (entry.exists && entry.previousValue) {
      const isSecret = Boolean(entry.secret);
      if (current) {
        await retryWithBackoff(
          () => functions.updateVariable(fnId, current.$id, VARIABLE_KEY, entry.previousValue, isSecret),
          options
        );
      } else {
        await retryWithBackoff(
          () => functions.createVariable(fnId, generateUniqueId(), VARIABLE_KEY, entry.previousValue, isSecret),
          {
            ...options,
            isCreate: true,
            reCheckFn: async () => {
              const checkRes = await functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']);
              return (checkRes.variables || []).find(v => v.key === VARIABLE_KEY);
            },
          }
        );
      }
      console.log(`[qa-vars] Rolled back ${VARIABLE_KEY} on ${fnId} (secret=${isSecret})`);
    } else {
      if (current) {
        await retryWithBackoff(
          () => functions.deleteVariable(fnId, current.$id),
          options
        );
        console.log(`[qa-vars] Rolled back (deleted) temporary ${VARIABLE_KEY} on ${fnId}`);
      }
    }

    // Readback verification for fnId
    const freshRes = await retryWithBackoff(
      () => functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']),
      options
    );
    const verified = (freshRes.variables || []).find(v => v.key === VARIABLE_KEY);

    if (entry.exists && entry.previousValue) {
      if (!verified || verified.value !== entry.previousValue) {
        throw new Error(`[qa-vars] Rollback verification failed on ${fnId}: active value does not match snapshot`);
      }
    } else {
      if (verified) {
        throw new Error(`[qa-vars] Rollback verification failed on ${fnId}: variable should not exist`);
      }
    }
    console.log(`[qa-vars] Rollback verified on ${fnId}`);
  }
}

async function captureAndApply(functions, targetQaUserId, options = {}) {
  if (!targetQaUserId) {
    throw new Error('TARGET_QA_USER_ID is required for capture-and-apply');
  }
  mask(targetQaUserId);

  const stateFilePath = options.stateFilePath || RESTORE_STATE_FILE;
  console.log(`[qa-vars] Capturing previous ${VARIABLE_KEY} across ${TARGET_HUBS.join(', ')}...`);

  // PHASE A — SNAPSHOT
  const snapshot = {};
  for (const fnId of TARGET_HUBS) {
    const listRes = await retryWithBackoff(
      () => functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']),
      options
    );
    const existing = (listRes.variables || []).find(v => v.key === VARIABLE_KEY);

    if (existing) {
      mask(existing.value);
      const isSecret = Boolean(existing.secret);
      snapshot[fnId] = {
        exists: true,
        varId: existing.$id,
        previousValue: existing.value,
        secret: isSecret,
      };
    } else {
      snapshot[fnId] = {
        exists: false,
        varId: null,
        previousValue: null,
        secret: false,
      };
    }
  }

  // Persist the COMPLETE restore snapshot before any variable mutation begins
  let fd;
  try {
    fd = fs.openSync(stateFilePath, 'w');
    fs.writeFileSync(fd, JSON.stringify(snapshot, null, 2), 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
  } catch (err) {
    if (fd !== null && fd !== undefined) {
      try { fs.closeSync(fd); } catch (_) {}
    }
    throw new Error(`[qa-vars] Failed to persist restore snapshot: ${err.message}. ZERO variables mutated.`);
  }

  console.log('[qa-vars] Restore snapshot successfully written to disk. Proceeding with atomic apply...');

  // PHASE B — APPLY
  const mutatedHubs = [];
  try {
    for (const fnId of TARGET_HUBS) {
      const entry = snapshot[fnId];

      if (entry.exists) {
        if (entry.previousValue !== targetQaUserId) {
          await retryWithBackoff(
            () => functions.updateVariable(fnId, entry.varId, VARIABLE_KEY, targetQaUserId, entry.secret),
            options
          );
          mutatedHubs.push(fnId);
          console.log(`[qa-vars] Updated ${VARIABLE_KEY} on ${fnId} (secret=${entry.secret})`);
        } else {
          console.log(`[qa-vars] ${VARIABLE_KEY} on ${fnId} already set to target QA user`);
        }
      } else {
        const created = await retryWithBackoff(
          () => functions.createVariable(fnId, generateUniqueId(), VARIABLE_KEY, targetQaUserId, false),
          {
            ...options,
            isCreate: true,
            reCheckFn: async () => {
              const checkRes = await functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']);
              return (checkRes.variables || []).find(v => v.key === VARIABLE_KEY);
            },
          }
        );
        entry.varId = created.$id;
        mutatedHubs.push(fnId);
        console.log(`[qa-vars] Created ${VARIABLE_KEY} on ${fnId} (secret=false)`);
      }
    }
  } catch (applyError) {
    // PHASE C — FAILURE ROLLBACK
    console.error(`[qa-vars] Apply failed on hub: ${applyError.message}. Initiating immediate in-process rollback...`);
    let rollbackError = null;
    try {
      await executeRollback(functions, snapshot, mutatedHubs, options);
    } catch (rErr) {
      rollbackError = rErr;
      console.error(`[qa-vars] In-process rollback encountered failure: ${rErr.message}. Preserving restore snapshot file for workflow fallback.`);
    }

    if (!rollbackError) {
      // Keep restore snapshot until rollback verification succeeds
      try {
        if (fs.existsSync(stateFilePath)) {
          fs.unlinkSync(stateFilePath);
        }
        console.log('[qa-vars] In-process rollback verified; restore snapshot file cleaned.');
      } catch (_) {}
    }

    throw applyError;
  }

  console.log('[qa-vars] Successfully saved previous state for restoration; NO code deployment occurred.');
}

async function restore(functions, tempQaUserId, options = {}) {
  mask(tempQaUserId);

  const stateFilePath = options.stateFilePath || RESTORE_STATE_FILE;
  if (!fs.existsSync(stateFilePath)) {
    console.log(`[qa-vars] No ephemeral restore record found at ${stateFilePath}; skipping restore.`);
    return { restored: false, reason: 'no_restore_record' };
  }

  const raw = fs.readFileSync(stateFilePath, 'utf8');
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

    const listRes = await retryWithBackoff(
      () => functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']),
      options
    );
    const current = (listRes.variables || []).find(v => v.key === VARIABLE_KEY);

    if (entry.exists && entry.previousValue) {
      const isSecret = Boolean(entry.secret);
      if (current) {
        if (current.value === entry.previousValue && Boolean(current.secret) === isSecret) {
          console.log(`[qa-vars] ${VARIABLE_KEY} on ${fnId} already at previous value`);
        } else {
          await retryWithBackoff(
            () => functions.updateVariable(fnId, current.$id, VARIABLE_KEY, entry.previousValue, isSecret),
            options
          );
          console.log(`[qa-vars] Restored ${VARIABLE_KEY} on ${fnId} (secret=${isSecret})`);
        }
      } else {
        await retryWithBackoff(
          () => functions.createVariable(fnId, generateUniqueId(), VARIABLE_KEY, entry.previousValue, isSecret),
          {
            ...options,
            isCreate: true,
            reCheckFn: async () => {
              const checkRes = await functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']);
              return (checkRes.variables || []).find(v => v.key === VARIABLE_KEY);
            },
          }
        );
        console.log(`[qa-vars] Restored (created) ${VARIABLE_KEY} on ${fnId} (secret=${isSecret})`);
      }
    } else {
      if (current) {
        await retryWithBackoff(
          () => functions.deleteVariable(fnId, current.$id),
          options
        );
        console.log(`[qa-vars] Deleted temporary ${VARIABLE_KEY} from ${fnId}`);
      } else {
        console.log(`[qa-vars] ${VARIABLE_KEY} on ${fnId} already absent`);
      }
    }

    // Readback verification
    const freshRes = await retryWithBackoff(
      () => functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']),
      options
    );
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
    fs.unlinkSync(stateFilePath);
  } catch (_) {}
  console.log('[qa-vars] All hubs restored successfully; ephemeral restore record removed.');
  return { restored: true };
}

async function audit(functions, options = {}) {
  console.log(`\n======================================================`);
  console.log(`READ-ONLY LIVE CONFIG AUDIT (${VARIABLE_KEY})`);
  console.log(`======================================================`);

  const hubMap = {};
  for (const fnId of TARGET_HUBS) {
    const res = await retryWithBackoff(
      () => functions.listVariables(fnId, [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']),
      options
    );
    const variable = (res.variables || []).find(v => v.key === VARIABLE_KEY);
    if (variable) {
      mask(variable.value);
      hubMap[fnId] = {
        exists: true,
        varId: variable.$id,
        value: variable.value,
        secret: Boolean(variable.secret),
      };
    } else {
      hubMap[fnId] = {
        exists: false,
        varId: null,
        value: null,
        secret: false,
      };
    }
  }

  const bc = hubMap['billing-checkout'];
  const ag = hubMap['ai-gateway'];
  const cp = hubMap['coupons'];

  const bc_eq_ag = Boolean(bc.exists && ag.exists && bc.value === ag.value);
  const bc_eq_cp = Boolean(bc.exists && cp.exists && bc.value === cp.value);
  const ag_eq_cp = Boolean(ag.exists && cp.exists && ag.value === cp.value);
  const consistent = Boolean(bc_eq_ag && bc_eq_cp && ag_eq_cp);

  console.log(`SAFE COMPARISON FACTS:`);
  console.log(`billing-checkout == ai-gateway: ${bc_eq_ag ? 'YES' : 'NO'}`);
  console.log(`billing-checkout == coupons:    ${bc_eq_cp ? 'YES' : 'NO'}`);
  console.log(`ai-gateway == coupons:          ${ag_eq_cp ? 'YES' : 'NO'}`);
  console.log(`all hubs consistent:            ${consistent ? 'YES' : 'NO'}`);
  console.log(`partial mutation proven:        ${(!consistent && ag_eq_cp && !bc_eq_ag) ? 'YES' : 'NO'}`);

  console.log(`\nHUB CONFIGURATION SUMMARY (MASKED):`);
  for (const fnId of TARGET_HUBS) {
    const entry = hubMap[fnId];
    console.log(`- ${fnId}: exists=${entry.exists} secret=${entry.secret} value=${maskId(entry.value)}`);
  }
  console.log(`======================================================\n`);

  return {
    hubMap,
    bc_eq_ag,
    bc_eq_cp,
    ag_eq_cp,
    consistent,
    partialMutationProven: (!consistent && ag_eq_cp && !bc_eq_ag),
  };
}

async function repair(functions, options = {}) {
  console.log(`\n======================================================`);
  console.log(`RUNTIME CONFIG REPAIR (${VARIABLE_KEY})`);
  console.log(`======================================================`);

  const currentAudit = await audit(functions, options);
  if (currentAudit.consistent) {
    console.log('[qa-vars] Runtime configuration is already consistent across all hubs. No repair required.');
    return { repaired: false, reason: 'already_consistent' };
  }

  const { hubMap, ag_eq_cp } = currentAudit;
  const ag = hubMap['ai-gateway'];
  const cp = hubMap['coupons'];
  const bc = hubMap['billing-checkout'];

  if (!ag_eq_cp || !ag.exists || !ag.value) {
    throw new Error('[qa-vars] STOP: Cannot determine authoritative pre-run value because ai-gateway and coupons do not match or are absent. OWNER_ACTION_REQUIRED.');
  }

  const targetValue = ag.value;
  const targetSecret = ag.secret;
  mask(targetValue);

  console.log(`[qa-vars] Authoritative pre-run value proven by ai-gateway and coupons: ${maskId(targetValue)} (secret=${targetSecret})`);
  console.log(`[qa-vars] Restoring billing-checkout to match authoritative pre-run value...`);

  if (bc.exists) {
    await retryWithBackoff(
      () => functions.updateVariable('billing-checkout', bc.varId, VARIABLE_KEY, targetValue, targetSecret),
      options
    );
  } else {
    await retryWithBackoff(
      () => functions.createVariable('billing-checkout', generateUniqueId(), VARIABLE_KEY, targetValue, targetSecret),
      {
        ...options,
        isCreate: true,
        reCheckFn: async () => {
          const checkRes = await functions.listVariables('billing-checkout', [sdk.Query ? sdk.Query.limit(100) : 'limit(100)']);
          return (checkRes.variables || []).find(v => v.key === VARIABLE_KEY);
        },
      }
    );
  }
  console.log(`[qa-vars] Updated billing-checkout to authoritative value.`);

  // Readback verification across all three hubs
  const postAudit = await audit(functions, options);
  if (!postAudit.consistent) {
    throw new Error('[qa-vars] Post-repair readback verification failed: hubs are not consistent.');
  }

  console.log('[qa-vars] Post-repair readback verification PASSED: billing-checkout == ai-gateway == coupons: YES');
  return { repaired: true };
}

async function main() {
  const action = process.argv[2];
  const targetQaUserId = String(process.env.TARGET_QA_USER_ID || process.argv[3] || '').trim();

  if (!['capture-and-apply', 'restore', 'audit', 'repair'].includes(action)) {
    console.error('Usage: node scripts/sync_whop_qa_user_variable.cjs <capture-and-apply|restore|audit|repair>');
    process.exit(1);
  }

  const functions = getAppwriteClient();

  if (action === 'capture-and-apply') {
    await captureAndApply(functions, targetQaUserId);
  } else if (action === 'restore') {
    await restore(functions, targetQaUserId);
  } else if (action === 'audit') {
    await audit(functions);
  } else if (action === 'repair') {
    await repair(functions);
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
  mask,
  maskId,
  retryWithBackoff,
  captureAndApply,
  executeRollback,
  restore,
  audit,
  repair,
};
