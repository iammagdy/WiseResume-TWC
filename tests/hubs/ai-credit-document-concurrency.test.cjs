const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function loadWithAxiosStub(request) {
  if (request === 'axios') return { get: async () => ({}), post: async () => ({}) };
  return originalLoad.apply(this, arguments);
};

const jobImport = require('../../appwrite-hubs/job-import/src/main.js').__test;
const resumeSection = require('../../appwrite-hubs/resume-section-ai/src/main.js').__test;
Module._load = originalLoad;

async function verifyDeterministicFirstCreation(name, helpers) {
  const userId = 'first-credit-user';
  const expectedId = helpers.creditDocumentId(userId);
  assert.match(expectedId, /^credit_[a-f0-9]{29}$/);
  assert.equal(expectedId.length, 36);
  assert.equal(expectedId, helpers.creditDocumentId(userId), `${name}: ID must be deterministic`);

  let stored = null;
  const createdIds = [];
  const db = {
    async createDocument(_databaseId, _collectionId, documentId, data) {
      createdIds.push(documentId);
      await new Promise(resolve => setImmediate(resolve));
      if (stored) throw Object.assign(new Error('Document already exists'), { code: 409 });
      stored = { $id: documentId, ...data };
      return { ...stored };
    },
    async getDocument(_databaseId, _collectionId, documentId) {
      assert.equal(documentId, expectedId);
      return { ...stored };
    },
  };

  const today = '2026-08-17';
  const [first, second] = await Promise.all([
    helpers.createOrLoadCreditDocument(db, userId, today),
    helpers.createOrLoadCreditDocument(db, userId, today),
  ]);

  assert.deepEqual(createdIds, [expectedId, expectedId]);
  assert.equal(first.$id, expectedId);
  assert.equal(second.$id, expectedId);
  assert.equal(first.user_id, userId);
}

(async () => {
  await verifyDeterministicFirstCreation('job-import', jobImport);
  await verifyDeterministicFirstCreation('resume-section-ai', resumeSection);

  const idempotencyKey = jobImport.computeJobImportKey('first-credit-user', 'https://jobs.example.test/role');
  let pendingCreated = false;
  const idempotencyDb = {
    async createDocument(_databaseId, _collectionId, documentId, data) {
      if (pendingCreated) throw Object.assign(new Error('Document already exists'), { code: 409 });
      pendingCreated = true;
      return { $id: documentId, ...data };
    },
  };
  const firstPending = await jobImport.createIdempotencyPending(idempotencyDb, idempotencyKey, 'first-credit-user');
  const concurrentPending = await jobImport.createIdempotencyPending(idempotencyDb, idempotencyKey, 'first-credit-user');
  assert.equal(firstPending.conflict, false);
  assert.equal(concurrentPending.conflict, true, 'concurrent duplicate must be detected before credit reservation');
  assert.equal(concurrentPending.docId, firstPending.docId);

  console.log('AI credit first-document concurrency tests passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
