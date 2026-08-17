const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'axios') return { post: async () => ({}) };
  return originalLoad.apply(this, arguments);
};
const wisehire = require('../../appwrite-hubs/wisehire-gateway/src/main.js');
Module._load = originalLoad;

const {
  completeWiseHireSignup,
  hasCurrentWiseHireEntitlement,
  inviteFailureReason,
  validateWiseHireInvite,
} = wisehire._test;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function queryValue(queries, attribute) {
  for (const raw of queries || []) {
    try {
      const query = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (query?.method === 'equal' && query.attribute === attribute) return query.values?.[0];
    } catch (_) {}
  }
  return undefined;
}

function makeDb(initial, options = {}) {
  let shared = clone(initial);
  const transactions = new Map();
  let nextTransaction = 1;

  function storeFor(transactionId) {
    return transactionId ? transactions.get(transactionId).data : shared;
  }

  return {
    state() { return clone(shared); },
    async createTransaction() {
      const id = `tx-${nextTransaction++}`;
      transactions.set(id, { data: clone(shared) });
      return { $id: id };
    },
    async listDocuments(_databaseId, collectionId, queries, transactionId) {
      const docs = storeFor(transactionId)[collectionId] || [];
      const pairs = [
        ['owner_id', queryValue(queries, 'owner_id')],
        ['user_id', queryValue(queries, 'user_id')],
        ['token', queryValue(queries, 'token')],
      ].filter(([, value]) => value !== undefined);
      const filtered = docs.filter((doc) => pairs.every(([key, value]) => doc[key] === value));
      return { documents: clone(filtered.slice(0, 1)), total: filtered.length };
    },
    async createDocument(_databaseId, collectionId, documentId, data, _permissions, transactionId) {
      const store = storeFor(transactionId);
      store[collectionId] ||= [];
      if (collectionId === 'wisehire_accounts' && store[collectionId].some((doc) => doc.user_id === data.user_id)) {
        throw Object.assign(new Error('duplicate user_id conflict'), { code: 409 });
      }
      const document = { $id: documentId, ...clone(data) };
      store[collectionId].push(document);
      return clone(document);
    },
    async updateDocument(_databaseId, collectionId, documentId, patch, _permissions, transactionId) {
      const docs = storeFor(transactionId)[collectionId] || [];
      const document = docs.find((candidate) => candidate.$id === documentId);
      if (!document) throw Object.assign(new Error('document not found'), { code: 404 });
      Object.assign(document, clone(patch));
      return clone(document);
    },
    async updateTransaction(transactionId, commit, rollback) {
      const transaction = transactions.get(transactionId);
      if (!transaction) return {};
      if (rollback) {
        transactions.delete(transactionId);
        return { status: 'rolled_back' };
      }
      if (commit) {
        if (options.conflictOnCommit) throw Object.assign(new Error('transaction conflict'), { code: 409 });
        shared = clone(transaction.data);
        transactions.delete(transactionId);
        return { status: 'committed' };
      }
      return { status: 'pending' };
    },
  };
}

function pendingInvite(overrides = {}) {
  return {
    $id: 'invite-1',
    email: 'owner@example.com',
    token: 'strong-invite-token-1234567890',
    status: 'pending',
    expires_at: '2099-01-01T00:00:00.000Z',
    target_user_id: '',
    ...overrides,
  };
}

async function expectRejected(promise, status, messagePattern) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, status);
    assert.match(error.message, messagePattern);
    return true;
  });
}

async function main() {
  const schemaSource = fs.readFileSync(
    path.resolve(__dirname, '../../scripts/setup_wisehire_collections_schema.cjs'),
    'utf8',
  );
  assert.match(schemaSource, /enforceServerOnlyCollection\(COLL, 'WiseHire Waitlist'\)/);
  assert.match(schemaSource, /enforceServerOnlyCollection\(COLL, 'WiseHire Invites'\)/);
  assert.match(schemaSource, /enforceServerOnlyCollection\(COLL, 'WiseHire Accounts'\)/);

  assert.equal(inviteFailureReason(null), 'not_found');
  assert.equal(inviteFailureReason(pendingInvite({ status: 'used' })), 'already_used');
  assert.equal(inviteFailureReason(pendingInvite({ status: 'revoked' })), 'revoked');
  assert.equal(inviteFailureReason(pendingInvite({ expires_at: '2020-01-01T00:00:00.000Z' })), 'expired');
  assert.equal(inviteFailureReason(pendingInvite(), Date.parse('2026-01-01T00:00:00.000Z')), null);

  const validationDb = makeDb({ wisehire_invites: [pendingInvite()] });
  assert.deepEqual(
    await validateWiseHireInvite(validationDb, { token: 'strong-invite-token-1234567890' }),
    {
      valid: true,
      recipient_email: 'owner@example.com',
      expires_at: '2099-01-01T00:00:00.000Z',
    },
  );
  assert.deepEqual(await validateWiseHireInvite(validationDb, { token: '' }), { valid: false, reason: 'missing_token' });
  assert.deepEqual(await validateWiseHireInvite(validationDb, { token: '1234567890123456' }), { valid: false, reason: 'not_found' });
  assert.deepEqual(
    await validateWiseHireInvite(validationDb, { code: 'strong-invite-token-1234567890' }),
    {
      valid: true,
      recipient_email: 'owner@example.com',
      expires_at: '2099-01-01T00:00:00.000Z',
    },
    'legacy early-access codes must use the same server-owned invitation authority',
  );

  assert.equal(hasCurrentWiseHireEntitlement({ status: 'active', plan: 'wisehire_business' }), true);
  assert.equal(hasCurrentWiseHireEntitlement({ status: 'active', plan: 'premium' }), false);
  assert.equal(hasCurrentWiseHireEntitlement({
    trial_plan: 'wisehire_professional',
    trial_expires_at: '2099-01-01T00:00:00.000Z',
  }, Date.parse('2026-01-01T00:00:00.000Z')), true);

  const noAuthorityDb = makeDb({
    wisehire_companies: [],
    wisehire_accounts: [],
    wisehire_invites: [],
    profiles: [],
  });
  await expectRejected(
    completeWiseHireSignup(noAuthorityDb, null, { invite_token: 'strong-invite-token-1234567890' }),
    401,
    /sign in/i,
  );
  await expectRejected(
    completeWiseHireSignup(noAuthorityDb, { $id: 'user-1', email: 'owner@example.com', emailVerification: true }, {}),
    403,
    /invitation or administrator approval/i,
  );
  assert.equal(noAuthorityDb.state().wisehire_companies.length, 0, 'an arbitrary signed-in user must not create a company');

  for (const user of [
    { $id: 'user-1', email: 'attacker@example.com', emailVerification: true },
    { $id: 'user-1', email: 'owner@example.com', emailVerification: false },
    { $id: 'different-user', email: 'owner@example.com', emailVerification: true },
  ]) {
    const invite = pendingInvite({ target_user_id: user.$id === 'different-user' ? 'user-1' : '' });
    const db = makeDb({ wisehire_companies: [], wisehire_accounts: [], wisehire_invites: [invite], profiles: [] });
    await expectRejected(
      completeWiseHireSignup(db, user, { invite_token: invite.token }),
      403,
      /different account|email address|verify your email/i,
    );
    assert.equal(db.state().wisehire_companies.length, 0, 'invalid invitation binding must not mutate signup state');
    assert.equal(db.state().wisehire_invites[0].status, 'pending');
  }

  const validDb = makeDb({
    wisehire_companies: [],
    wisehire_accounts: [],
    wisehire_invites: [pendingInvite()],
    profiles: [{ $id: 'profile-1', user_id: 'user-1', account_type: 'job_seeker' }],
  });
  assert.deepEqual(
    await completeWiseHireSignup(
      validDb,
      { $id: 'user-1', email: 'OWNER@example.com', emailVerification: true },
      { invite_token: 'strong-invite-token-1234567890', company_name: 'Example Co', company_size: '11-50' },
    ),
    { success: true },
  );
  const validState = validDb.state();
  assert.equal(validState.wisehire_companies.length, 1);
  assert.equal(validState.wisehire_companies[0].owner_id, 'user-1');
  assert.equal(validState.wisehire_accounts.length, 1);
  assert.equal(validState.wisehire_accounts[0].user_id, 'user-1');
  assert.equal(validState.wisehire_invites[0].status, 'used');
  assert.equal(validState.wisehire_invites[0].target_user_id, 'user-1');
  assert.equal(validState.profiles[0].account_type, 'hr');
  assert.equal(validState.subscriptions.length, 1);
  assert.equal(validState.subscriptions[0].plan, 'free');
  assert.equal(validState.subscriptions[0].effective_plan, 'wisehire_professional');
  assert.equal(validState.subscriptions[0].trial_plan, 'wisehire_professional');
  assert.equal(validState.subscriptions[0].status, 'active');
  assert.ok(Date.parse(validState.subscriptions[0].trial_expires_at) > Date.now());

  assert.deepEqual(
    await completeWiseHireSignup(
      validDb,
      { $id: 'user-1', email: 'owner@example.com', emailVerification: true },
      {},
    ),
    { success: true, already_completed: true },
    'retrying an already-completed signup must not require or mint a second invitation',
  );
  assert.equal(validDb.state().wisehire_companies.length, 1);
  assert.equal(
    validDb.state().subscriptions[0].trial_expires_at,
    validState.subscriptions[0].trial_expires_at,
    'idempotent completion must not extend the original trial',
  );

  const repairDb = makeDb({
    wisehire_companies: [{ $id: 'company-existing', owner_id: 'repair-user', name: 'Repair Co' }],
    wisehire_accounts: [],
    wisehire_invites: [],
    profiles: [{ $id: 'profile-repair', user_id: 'repair-user', account_type: 'job_seeker' }],
    subscriptions: [],
  });
  assert.deepEqual(
    await completeWiseHireSignup(
      repairDb,
      { $id: 'repair-user', email: 'repair@example.com', emailVerification: true },
      {},
    ),
    { success: true, already_completed: true },
  );
  assert.equal(repairDb.state().profiles[0].account_type, 'hr');
  assert.equal(repairDb.state().subscriptions[0].trial_plan, 'wisehire_professional');

  const paidDb = makeDb({
    wisehire_companies: [{ $id: 'company-paid', owner_id: 'paid-user', name: 'Paid Co' }],
    wisehire_accounts: [],
    wisehire_invites: [],
    profiles: [{ $id: 'profile-paid', user_id: 'paid-user', account_type: 'hr' }],
    subscriptions: [{
      $id: 'subscription-paid',
      user_id: 'paid-user',
      plan: 'wisehire_business',
      effective_plan: 'wisehire_business',
      status: 'active',
      trial_plan: null,
      trial_expires_at: null,
    }],
  });
  await completeWiseHireSignup(
    paidDb,
    { $id: 'paid-user', email: 'paid@example.com', emailVerification: true },
    {},
  );
  assert.deepEqual(
    paidDb.state().subscriptions[0],
    {
      $id: 'subscription-paid',
      user_id: 'paid-user',
      plan: 'wisehire_business',
      effective_plan: 'wisehire_business',
      status: 'active',
      trial_plan: null,
      trial_expires_at: null,
    },
    'an active paid WiseHire entitlement must never be overwritten by signup',
  );

  const approvedDb = makeDb({
    wisehire_companies: [],
    wisehire_accounts: [{ $id: 'account-1', user_id: 'approved-user', email: 'approved@example.com', approved_at: '2026-01-01T00:00:00.000Z' }],
    wisehire_invites: [pendingInvite()],
    profiles: [{ $id: 'profile-2', user_id: 'approved-user', account_type: 'hr' }],
  });
  assert.deepEqual(
    await completeWiseHireSignup(
      approvedDb,
      { $id: 'approved-user', email: 'approved@example.com', emailVerification: true },
      { company_name: 'Approved Co', invite_token: 'strong-invite-token-1234567890' },
    ),
    { success: true },
    'a server-approved account is sufficient signup authority without a reusable client code',
  );
  assert.equal(
    approvedDb.state().wisehire_invites[0].status,
    'pending',
    'an approved account must not consume an unrelated invitation supplied by the client',
  );

  const conflictDb = makeDb({
    wisehire_companies: [],
    wisehire_accounts: [],
    wisehire_invites: [pendingInvite()],
    profiles: [],
  }, { conflictOnCommit: true });
  await expectRejected(
    completeWiseHireSignup(
      conflictDb,
      { $id: 'user-1', email: 'owner@example.com', emailVerification: true },
      { invite_token: 'strong-invite-token-1234567890' },
    ),
    409,
    /already completed|being completed/i,
  );
  assert.equal(conflictDb.state().wisehire_companies.length, 0, 'transaction conflicts must not leave a partial company');
  assert.equal(conflictDb.state().wisehire_invites[0].status, 'pending', 'transaction conflicts must not consume the invite');

  console.log('wisehire signup authorization tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
