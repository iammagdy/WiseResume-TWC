const assert = require('node:assert/strict');

const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'axios') return { get: async () => ({}), post: async () => ({}) };
  return originalLoad.apply(this, arguments);
};
const hub = require('../../appwrite-hubs/job-import/src/main.js');
Module._load = originalLoad;

function atomicCreditDb() {
  const shared = {
    $id: 'credit-1',
    daily_usage: 4,
    total_usage: 4,
    usage_date: '2026-08-17',
    version: 0,
  };
  const transactions = new Map();
  let nextId = 1;
  return {
    shared,
    async createTransaction() {
      const id = `tx-${nextId++}`;
      transactions.set(id, { baseVersion: shared.version, staged: { ...shared } });
      return { $id: id };
    },
    async getDocument(_db, _collection, _id, _queries, transactionId) {
      return { ...transactions.get(transactionId).staged };
    },
    async updateDocument(_db, _collection, _id, patch, _permissions, transactionId) {
      Object.assign(transactions.get(transactionId).staged, patch);
      return { ...transactions.get(transactionId).staged };
    },
    async incrementDocumentAttribute(_db, _collection, _id, attribute, amount, maximum, transactionId) {
      const transaction = transactions.get(transactionId);
      const next = Number(transaction.staged[attribute] || 0) + amount;
      if (maximum !== undefined && next > maximum) {
        throw Object.assign(new Error('Maximum exceeded'), { code: 409 });
      }
      transaction.staged[attribute] = next;
      return { ...transaction.staged };
    },
    async updateTransaction(transactionId, commit, rollback) {
      const transaction = transactions.get(transactionId);
      if (!transaction) return {};
      if (rollback) {
        transactions.delete(transactionId);
        return {};
      }
      if (commit) {
        if (transaction.baseVersion !== shared.version) {
          throw Object.assign(new Error('Transaction conflict'), { code: 409 });
        }
        Object.assign(shared, transaction.staged, { version: shared.version + 1 });
        transactions.delete(transactionId);
      }
      return {};
    },
  };
}

(async () => {
  const db = atomicCreditDb();
  const creditState = {
    blocked: false,
    doc: { $id: 'credit-1' },
    dailyLimit: 5,
    currentUsage: 4,
    cost: 1,
    today: '2026-08-17',
  };

  const results = await Promise.allSettled([
    hub.__test.recordAiUsage(db, creditState),
    hub.__test.recordAiUsage(db, creditState),
  ]);

  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  const rejection = results.find(result => result.status === 'rejected');
  assert.equal(rejection.reason.httpStatus, 402);
  assert.equal(db.shared.daily_usage, 5, 'parallel reservations cannot exceed the plan limit');
  assert.equal(db.shared.total_usage, 5, 'only one provider call can reserve the final credit');

  console.log('[TEST] job-import atomic credit reservation verified');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
