const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

function makeRes() {
  return {
    last: null,
    json(body, status = 200) {
      this.last = { body, status };
      return this.last;
    },
    send(body, status = 200) {
      this.last = { body, status };
      return this.last;
    },
  };
}

function makeLogger() {
  return {
    log() {},
    error() {},
  };
}

async function testAiGatewayRejectsMissingJwt() {
  process.env.APPWRITE_FUNCTION_PROJECT_ID = 'test-project';
  process.env.APPWRITE_FUNCTION_API_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
  const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');
  const res = makeRes();
  await aiGateway({
    req: {
      body: JSON.stringify({ featureName: 'analyze-resume', resumeText: 'private resume text' }),
      headers: {},
    },
    res,
    ...makeLogger(),
  });
  assert.equal(res.last.status, 401);
  assert.equal(res.last.body.code, 'unauthorized');
}

async function testResumeSectionRejectsMissingJwt() {
  const resumeSection = require('../../appwrite-hubs/resume-section-ai/src/main.js');
  const res = makeRes();
  await resumeSection({
    req: {
      method: 'POST',
      body: JSON.stringify({
        section: 'summary',
        action: 'improve',
        currentContent: 'Short summary',
      }),
      headers: {},
    },
    res,
    ...makeLogger(),
  });
  assert.equal(res.last.status, 401);
  assert.equal(res.last.body.code, 'unauthorized');
}

async function loadRevenueCatModule() {
  const modulePath = path.resolve(__dirname, '../../appwrite-hubs/revenuecat-webhook/src/main.js');
  return import(pathToFileURL(modulePath).href);
}

async function testRevenueCatAuthAndBodyParsing() {
  const revenueCat = await loadRevenueCatModule();
  process.env.REVENUECAT_WEBHOOK_SECRET = 'expected-secret';

  const unauthorizedRes = makeRes();
  await revenueCat.default({
    req: { headers: { authorization: 'wrong-secret' }, body: '{}' },
    res: unauthorizedRes,
    ...makeLogger(),
  });
  assert.equal(unauthorizedRes.last.status, 401);

  const malformedRes = makeRes();
  await revenueCat.default({
    req: { headers: { authorization: 'expected-secret' }, body: '{not-json' },
    res: malformedRes,
    ...makeLogger(),
  });
  assert.equal(malformedRes.last.status, 400);

  assert.deepEqual(revenueCat.parseWebhookPayload({ event: { type: 'TEST' } }), { event: { type: 'TEST' } });
  assert.deepEqual(revenueCat.parseWebhookPayload('{"event":{"type":"TEST"}}'), { event: { type: 'TEST' } });
}

async function testRevenueCatIgnoredAndGrantRevokeEvents() {
  const revenueCat = await loadRevenueCatModule();
  const writes = [];
  const fakeDatabases = {
    async listDocuments() {
      return { total: 0, documents: [] };
    },
    async createDocument(databaseId, collectionId, documentId, data) {
      writes.push({ type: 'create', databaseId, collectionId, documentId, data });
      return { $id: documentId, ...data };
    },
    async updateDocument(databaseId, collectionId, documentId, data) {
      writes.push({ type: 'update', databaseId, collectionId, documentId, data });
      return { $id: documentId, ...data };
    },
  };

  const ignored = await revenueCat.processRevenueCatPayload({
    event: { type: 'SUBSCRIBER_ALIAS', app_user_id: 'user_1' },
  }, fakeDatabases, makeLogger().log, makeLogger().error);
  assert.equal(ignored.body.skipped, true);
  assert.equal(writes.length, 0);

  const grant = await revenueCat.processRevenueCatPayload({
    event: { type: 'INITIAL_PURCHASE', app_user_id: 'user_1', entitlement_ids: ['pro'] },
  }, fakeDatabases, makeLogger().log, makeLogger().error);
  assert.equal(grant.body.ok, true);
  assert.equal(writes[0].type, 'create');
  assert.equal(writes[0].data.plan, 'pro');
  assert.equal(writes[0].data.status, 'active');

  const revokeDb = {
    async listDocuments() {
      return { total: 1, documents: [{ $id: 'sub_1' }] };
    },
    async updateDocument(databaseId, collectionId, documentId, data) {
      writes.push({ type: 'update', databaseId, collectionId, documentId, data });
      return { $id: documentId, ...data };
    },
  };
  const revoke = await revenueCat.processRevenueCatPayload({
    event: { type: 'EXPIRATION', app_user_id: 'user_1' },
  }, revokeDb, makeLogger().log, makeLogger().error);
  assert.equal(revoke.body.ok, true);
  assert.equal(writes.at(-1).type, 'update');
  assert.equal(writes.at(-1).data.plan, 'free');
  assert.equal(writes.at(-1).data.status, 'cancelled');
}

async function main() {
  await testAiGatewayRejectsMissingJwt();
  await testResumeSectionRejectsMissingJwt();
  await testRevenueCatAuthAndBodyParsing();
  await testRevenueCatIgnoredAndGrantRevokeEvents();
  console.log('p0-readiness hub tests passed');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
