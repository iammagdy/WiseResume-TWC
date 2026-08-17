const assert = require('node:assert/strict');

const coupons = require('../../appwrite-hubs/coupons/src/main.js');
const { redeemCouponAtomically, redemptionDocumentId } = coupons.__test;

function clone(value) {
  return structuredClone(value);
}

function queryParts(query) {
  try { return JSON.parse(query); } catch { return null; }
}

function fakeDatabase(initialCoupon) {
  const state = {
    version: 0,
    collections: {
      discount_codes: [clone(initialCoupon)],
      subscriptions: [],
      coupon_redemptions: [],
    },
  };
  const transactions = new Map();
  let nextTransaction = 1;

  function view(transactionId) {
    return transactionId
      ? transactions.get(transactionId).collections
      : state.collections;
  }

  return {
    state,
    async createTransaction() {
      const id = `tx-${nextTransaction++}`;
      transactions.set(id, {
        baseVersion: state.version,
        collections: clone(state.collections),
      });
      return { $id: id };
    },
    async listDocuments(_databaseId, collectionId, queries = [], transactionId) {
      let documents = clone(view(transactionId)[collectionId] || []);
      for (const rawQuery of queries) {
        const query = queryParts(rawQuery);
        if (query?.method === 'equal') {
          documents = documents.filter(document => query.values.includes(document[query.attribute]));
        }
        if (query?.method === 'limit') documents = documents.slice(0, Number(query.values[0]));
      }
      return { total: documents.length, documents };
    },
    async getDocument(_databaseId, collectionId, documentId, _queries, transactionId) {
      const document = view(transactionId)[collectionId]?.find(item => item.$id === documentId);
      if (!document) throw Object.assign(new Error('Not found'), { code: 404 });
      return clone(document);
    },
    async createDocument(_databaseId, collectionId, documentId, payload, _permissions, transactionId) {
      const documents = view(transactionId)[collectionId];
      if (documents.some(item => item.$id === documentId)) {
        throw Object.assign(new Error('Document conflict'), { code: 409 });
      }
      const document = { $id: documentId, ...clone(payload) };
      documents.push(document);
      return clone(document);
    },
    async updateDocument(_databaseId, collectionId, documentId, payload, _permissions, transactionId) {
      const documents = view(transactionId)[collectionId];
      const index = documents.findIndex(item => item.$id === documentId);
      if (index < 0) throw Object.assign(new Error('Not found'), { code: 404 });
      documents[index] = { ...documents[index], ...clone(payload) };
      return clone(documents[index]);
    },
    async incrementDocumentAttribute(
      _databaseId,
      collectionId,
      documentId,
      attribute,
      amount,
      maximum,
      transactionId,
    ) {
      const documents = view(transactionId)[collectionId];
      const document = documents.find(item => item.$id === documentId);
      if (!document) throw Object.assign(new Error('Not found'), { code: 404 });
      const next = Number(document[attribute] || 0) + amount;
      if (maximum !== undefined && next > maximum) {
        throw Object.assign(new Error('Maximum exceeded'), { code: 409 });
      }
      document[attribute] = next;
      return clone(document);
    },
    async updateTransaction(transactionId, commit, rollback) {
      const transaction = transactions.get(transactionId);
      if (!transaction) return {};
      if (rollback) {
        transactions.delete(transactionId);
        return {};
      }
      if (commit) {
        if (transaction.baseVersion !== state.version) {
          throw Object.assign(new Error('Transaction conflict'), { code: 409 });
        }
        state.collections = clone(transaction.collections);
        state.version += 1;
        transactions.delete(transactionId);
      }
      return {};
    },
  };
}

const coupon = {
  $id: 'coupon-premium',
  code: 'PREMIUM30',
  active: true,
  plan_override: 'premium',
  plan_days: 30,
  max_uses: 1,
  uses_count: 0,
};
const fixedNow = Date.UTC(2026, 7, 17, 8, 0, 0);

(async () => {
  {
    const database = fakeDatabase(coupon);
    const results = await Promise.all([
      redeemCouponAtomically(database, 'user-a', coupon.code, () => fixedNow),
      redeemCouponAtomically(database, 'user-b', coupon.code, () => fixedNow),
    ]);

    assert.deepEqual(results.map(result => result.outcome).sort(), ['invalid', 'redeemed']);
    assert.equal(database.state.collections.discount_codes[0].uses_count, 1);
    assert.equal(database.state.collections.subscriptions.length, 1);
    assert.equal(database.state.collections.coupon_redemptions.length, 1);
  }

  {
    const database = fakeDatabase(coupon);
    const results = await Promise.all([
      redeemCouponAtomically(database, 'same-user', coupon.code, () => fixedNow),
      redeemCouponAtomically(database, 'same-user', coupon.code, () => fixedNow),
    ]);

    assert.deepEqual(results.map(result => result.outcome).sort(), ['already_redeemed', 'redeemed']);
    assert.equal(database.state.collections.discount_codes[0].uses_count, 1);
    assert.equal(database.state.collections.subscriptions.length, 1);
    assert.equal(database.state.collections.coupon_redemptions.length, 1);
    assert.equal(
      database.state.collections.coupon_redemptions[0].$id,
      redemptionDocumentId('same-user', coupon.$id),
    );

    const replay = await redeemCouponAtomically(database, 'same-user', coupon.code, () => fixedNow);
    assert.equal(replay.outcome, 'already_redeemed');
    assert.equal(database.state.collections.discount_codes[0].uses_count, 1);
  }

  {
    const database = fakeDatabase({ ...coupon, plan_days: 999, max_uses: 0 });
    const result = await redeemCouponAtomically(database, 'user-a', coupon.code, () => fixedNow);
    assert.equal(result.outcome, 'misconfigured');
    assert.equal(database.state.collections.subscriptions.length, 0);
    assert.equal(database.state.collections.coupon_redemptions.length, 0);
    assert.equal(database.state.collections.discount_codes[0].uses_count, 0);
  }

  console.log('coupon atomic redemption tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
