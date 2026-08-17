const assert = require('node:assert/strict');
const axios = require('../../appwrite-hubs/resume-section-ai/node_modules/axios');

const {
  callChargedLLM,
  parseEnhanceResponse,
} = require('../../appwrite-hubs/resume-section-ai/src/main.js').__test;

function makeDb() {
  const shared = {
    $id: 'credit-1',
    usage_date: new Date().toISOString().slice(0, 10),
    daily_usage: 2,
    total_usage: 9,
  };
  const transactions = new Map();
  let nextTransaction = 1;

  return {
    shared,
    async listDocuments(_database, collection) {
      if (collection === 'subscriptions') {
        return { documents: [{ effective_plan: 'premium' }], total: 1 };
      }
      if (collection === 'ai_credits') {
        return { documents: [{ ...shared }], total: 1 };
      }
      return { documents: [], total: 0 };
    },
    async createTransaction() {
      const id = `tx-${nextTransaction++}`;
      transactions.set(id, { staged: { ...shared } });
      return { $id: id };
    },
    async getDocument(_database, _collection, _id, _queries, transactionId) {
      return { ...transactions.get(transactionId).staged };
    },
    async updateDocument(_database, _collection, _id, patch, _permissions, transactionId) {
      Object.assign(transactions.get(transactionId).staged, patch);
      return { ...transactions.get(transactionId).staged };
    },
    async incrementDocumentAttribute(_database, _collection, _id, key, value, _max, transactionId) {
      const staged = transactions.get(transactionId).staged;
      staged[key] = Number(staged[key] || 0) + value;
      return { ...staged };
    },
    async decrementDocumentAttribute(_database, _collection, _id, key, value, _min, transactionId) {
      const staged = transactions.get(transactionId).staged;
      staged[key] = Number(staged[key] || 0) - value;
      return { ...staged };
    },
    async updateTransaction(transactionId, commit, rollback) {
      const transaction = transactions.get(transactionId);
      if (rollback) {
        transactions.delete(transactionId);
        return { $id: transactionId, status: 'rolled_back' };
      }
      if (commit) Object.assign(shared, transaction.staged);
      transactions.delete(transactionId);
      return { $id: transactionId, status: commit ? 'committed' : 'pending' };
    },
    async createDocument() {
      return { $id: 'receipt-1' };
    },
    async deleteDocument() {},
  };
}

async function main() {
  const originalPost = axios.post;
  const db = makeDb();
  axios.post = async () => ({
    data: { choices: [{ message: { content: 'provider returned non-JSON prose' } }] },
  });

  try {
    await assert.rejects(
      callChargedLLM(
        [{ role: 'user', content: 'Improve this summary.' }],
        [{ provider: 'groq', key: 'test', url: 'https://provider.invalid', model: 'test-model' }],
        db,
        'user-1',
        'enhance',
        'improve',
        { requestId: 'request-1', hub: 'resume-section-ai', startedAt: new Date() },
        raw => parseEnhanceResponse(raw, 'Original summary.'),
      ),
      (err) => err.httpStatus === 502 && err.code === 'invalid_ai_response',
    );

    assert.equal(db.shared.daily_usage, 2, 'invalid provider output must refund daily credits');
    assert.equal(db.shared.total_usage, 9, 'invalid provider output must refund lifetime credits');
  } finally {
    axios.post = originalPost;
  }

  console.log('resume-section invalid-response refund test passed');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
