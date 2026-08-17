const assert = require('node:assert/strict');

const { recordAiUsage, refundAiUsage } = require('../../appwrite-hubs/resume-section-ai/src/main.js').__test;

function makeTransactionalCreditDb(initialDoc) {
  const shared = { ...initialDoc, _version: 0 };
  const transactions = new Map();
  let nextId = 1;

  return {
    shared,
    async createTransaction() {
      const id = `tx-${nextId++}`;
      transactions.set(id, { snapshotVersion: shared._version, staged: { ...shared } });
      return { $id: id };
    },
    async getDocument(_db, _collection, _id, _queries, transactionId) {
      const tx = transactions.get(transactionId);
      tx.snapshotVersion = shared._version;
      tx.staged = { ...shared };
      return { ...tx.staged };
    },
    async updateDocument(_db, _collection, _id, patch, _permissions, transactionId) {
      Object.assign(transactions.get(transactionId).staged, patch);
      return { ...transactions.get(transactionId).staged };
    },
    async incrementDocumentAttribute(_db, _collection, _id, key, value, max, transactionId) {
      const tx = transactions.get(transactionId);
      const next = Number(tx.staged[key] || 0) + value;
      if (max != null && next > max) throw Object.assign(new Error('maximum exceeded'), { code: 400 });
      tx.staged[key] = next;
      return { ...tx.staged };
    },
    async decrementDocumentAttribute(_db, _collection, _id, key, value, min, transactionId) {
      const tx = transactions.get(transactionId);
      const next = Number(tx.staged[key] || 0) - value;
      if (min != null && next < min) throw Object.assign(new Error('minimum exceeded'), { code: 400 });
      tx.staged[key] = next;
      return { ...tx.staged };
    },
    async updateTransaction(transactionId, commit, rollback) {
      const tx = transactions.get(transactionId);
      if (rollback) {
        transactions.delete(transactionId);
        return { $id: transactionId, status: 'rolled_back' };
      }
      if (commit) {
        if (tx.snapshotVersion !== shared._version) {
          throw Object.assign(new Error('transaction conflict'), { code: 409 });
        }
        const nextVersion = shared._version + 1;
        Object.assign(shared, tx.staged, { _version: nextVersion });
        transactions.delete(transactionId);
        return { $id: transactionId, status: 'committed' };
      }
      return { $id: transactionId, status: 'pending' };
    },
  };
}

async function main() {
  const today = '2026-08-17';
  const db = makeTransactionalCreditDb({
    $id: 'credit-1',
    usage_date: today,
    daily_usage: 4,
    total_usage: 10,
  });
  const state = {
    blocked: false,
    cost: 1,
    today,
    dailyLimit: 5,
    doc: { $id: 'credit-1' },
  };

  const results = await Promise.allSettled([
    recordAiUsage(db, state),
    recordAiUsage(db, state),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(db.shared.daily_usage, 5, 'two calls at 4/5 may reserve only one credit');
  assert.equal(db.shared.total_usage, 11, 'the losing request must not increment lifetime usage');

  await refundAiUsage(db, state);
  assert.equal(db.shared.daily_usage, 4, 'failed provider work refunds the reservation');
  assert.equal(db.shared.total_usage, 10, 'refund restores lifetime usage too');

  console.log('resume-section atomic credit tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
