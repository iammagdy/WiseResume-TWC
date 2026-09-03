const assert = require('node:assert/strict');
const path = require('node:path');

const collections = new Map();
let nextId = 1;
let updatedAt = 1;
let failCreatePending = false;
let failUpdateSuccess = false;

function collection(name) {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name);
}

function queryMatches(doc, query) {
  if (!query || query.op === 'limit') return true;
  if (query.op === 'equal') {
    const values = Array.isArray(query.value) ? query.value : [query.value];
    return values.includes(doc[query.attribute]);
  }
  if (query.op === 'greaterThanEqual') return doc[query.attribute] >= query.value;
  return true;
}

const fakeDb = {
  async listDocuments(_databaseId, collectionId, queries = []) {
    const documents = [...collection(collectionId).values()]
      .filter((doc) => queries.every((query) => queryMatches(doc, query)));
    return { total: documents.length, documents };
  },
  async createDocument(_databaseId, collectionId, requestedId, data) {
    if (failCreatePending && collectionId === 'idempotency_cache') {
      const error = new Error('Simulated database error creating pending idempotency document');
      error.code = 500;
      throw error;
    }
    const docs = collection(collectionId);
    const id = requestedId === 'unique()' ? `doc-${nextId++}` : requestedId;
    if (docs.has(id)) {
      const error = new Error('Document already exists');
      error.code = 409;
      throw error;
    }
    if (collectionId === 'idempotency_cache' && [...docs.values()].some((doc) => doc.key === data.key)) {
      const error = new Error('Duplicate idempotency key');
      error.code = 409;
      throw error;
    }
    const doc = { ...data, $id: id, $updatedAt: `updated-${updatedAt++}` };
    docs.set(id, doc);
    return doc;
  },
  async getDocument(_databaseId, collectionId, id) {
    const doc = collection(collectionId).get(id);
    if (!doc) {
      const error = new Error('Document not found');
      error.code = 404;
      throw error;
    }
    return doc;
  },
  async updateDocument(_databaseId, collectionId, id, data) {
    if (failUpdateSuccess && collectionId === 'idempotency_cache') {
      const error = new Error('Simulated database error updating success result');
      error.code = 500;
      throw error;
    }
    const docs = collection(collectionId);
    const current = await this.getDocument(_databaseId, collectionId, id);
    const doc = { ...current, ...data, $updatedAt: `updated-${updatedAt++}` };
    docs.set(id, doc);
    return doc;
  },
  async deleteDocument(_databaseId, collectionId, id) {
    collection(collectionId).delete(id);
  },
};

class FakeClient {
  setEndpoint() { return this; }
  setProject() { return this; }
  setKey() { return this; }
  setJWT() { return this; }
}

class FakeDatabases {
  constructor() { return fakeDb; }
}

class FakeAccount {
  async get() {
    return { $id: 'user-linkedin', email: 'linkedin-qa@example.com', labels: [] };
  }
}

const fakeSdk = {
  Client: FakeClient,
  Databases: FakeDatabases,
  Account: FakeAccount,
  ID: { unique: () => 'unique()' },
  Permission: { read: () => 'read' },
  Role: { user: (id) => `user:${id}` },
  Query: {
    equal: (attribute, value) => ({ op: 'equal', attribute, value }),
    greaterThanEqual: (attribute, value) => ({ op: 'greaterThanEqual', attribute, value }),
    limit: (value) => ({ op: 'limit', value }),
  },
};

const gatewayModulePath = path.join(__dirname, '../../appwrite-hubs/ai-gateway');
const sdkPath = require.resolve('node-appwrite', { paths: [gatewayModulePath] });
require.cache[sdkPath] = {
  id: sdkPath,
  filename: sdkPath,
  loaded: true,
  exports: fakeSdk,
  children: [],
  paths: [],
};

Object.assign(process.env, {
  APPWRITE_FUNCTION_API_ENDPOINT: 'https://example.test/v1',
  APPWRITE_FUNCTION_PROJECT_ID: 'project-test',
  APPWRITE_FUNCTION_API_KEY: 'server-test-key',
  DEEPSEEK_KEY: 'deepseek-test-key',
  GROQ_KEY_1: 'groq-test-key',
  GATEWAY_SMOKE_SECRET: 'smoke-test-secret',
  ADMIN_TEST_HMAC_SECRET: 'admin-test-secret',
  PUBLIC_SHARE_TOKEN_SECRET: 'public-share-test-secret',
  RESEND_API_KEY: 'resend-test-key',
  TURNSTILE_SECRET_KEY: 'turnstile-test-key',
});

collection('subscriptions').set('subscription-linkedin', {
  $id: 'subscription-linkedin',
  user_id: 'user-linkedin',
  effective_plan: 'premium',
});

collection('ai_credits').set('credits-linkedin', {
  $id: 'credits-linkedin',
  $updatedAt: 'updated-0',
  user_id: 'user-linkedin',
  daily_usage: 0,
  total_usage: 0,
  usage_date: new Date().toISOString().slice(0, 10),
});

const axios = require(require.resolve('axios', {
  paths: [gatewayModulePath],
}));
const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

const baseResume = {
  contactInfo: { fullName: 'Jane Doe', email: 'jane@example.com' },
  summary: 'Experienced Software Architect',
  skills: ['Node.js', 'React', 'Cloud'],
  experience: [{
    company: 'TechCorp',
    position: 'Lead Architect',
    startDate: '2020-01',
    description: 'Spearheaded cloud migration.',
  }],
};

const successfulLinkedInResponse = {
  data: {
    choices: [{
      message: {
        content: JSON.stringify({
          headlines: ['Lead Architect | Cloud Systems', 'Software Engineer | Node.js & React'],
          aboutSections: {
            short: 'Short about section.',
            medium: 'Medium about section.',
            long: 'Long detailed about section.',
          },
          experienceRewrites: [{ position: 'Lead Architect', company: 'TechCorp', linkedin: 'Spearheaded enterprise cloud migration.' }],
          suggestedSkills: ['Distributed Systems', 'TypeScript'],
          keywords: ['Cloud Migration', 'Architecture'],
          tips: ['Highlight your recent cloud certifications.'],
        }),
      },
    }],
    usage: {},
  },
};

function linkedInRequest(resume = baseResume, region = 'global') {
  return {
    headers: {},
    body: JSON.stringify({
      featureName: 'optimize-for-linkedin',
      resume,
      region,
      __headers: {
        'X-Appwrite-JWT': 'user-test-jwt',
      },
    }),
  };
}

function responseRecorder() {
  let statusCode = 200;
  let payload = null;
  return {
    json(body, status = 200) {
      statusCode = status;
      payload = body;
      return { statusCode, payload };
    },
    get statusCode() { return statusCode; },
    get payload() { return payload; },
  };
}

function linkedInResultOnlyRequest(resume = baseResume, region = 'global') {
  return {
    headers: {},
    body: JSON.stringify({
      featureName: 'optimize-for-linkedin',
      resume,
      region,
      __headers: {
        'X-Appwrite-JWT': 'user-test-jwt',
        'X-AI-Result-Only': 'true',
      },
    }),
  };
}

async function runTests() {
  let providerCalls = 0;
  axios.post = async () => {
    providerCalls++;
    return successfulLinkedInResponse;
  };

  // Test 1: Missing idempotency reservation fails closed before provider invocation
  {
    failCreatePending = true;
    failUpdateSuccess = false;
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const res = responseRecorder();

    await aiGateway({
      req: linkedInRequest(),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 503);
    assert.equal(res.payload.code, 'idempotency_unavailable');
    assert.equal(providerCalls, 0, 'Provider must NOT be called when reservation fails');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits,
      'No credits should be charged on reservation failure',
    );
    failCreatePending = false;
  }

  // Test 2: Successful output is cached before usage success is committed, returns valid payload
  {
    failCreatePending = false;
    failUpdateSuccess = false;
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const res = responseRecorder();

    await aiGateway({
      req: linkedInRequest(),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.status, 'success');
    assert.equal(providerCalls, 1, 'Provider should be called exactly once');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits + 1,
      'Credit should be recorded on successful completion',
    );

    // Verify idempotency cache contains success status and full result
    const cachedDocs = [...collection('idempotency_cache').values()];
    const linkedInDoc = cachedDocs.find((d) => d.feature === 'optimize-for-linkedin');
    assert.ok(linkedInDoc, 'Idempotency document must exist in cache');
    assert.equal(linkedInDoc.status, 'success');
    const parsedResult = JSON.parse(linkedInDoc.cached_result);
    assert.ok(parsedResult.data.headlines.length > 0);
  }

  // Test 3: Cache persistence failure does NOT charge credit and returns 503 result_unavailable
  {
    failCreatePending = false;
    failUpdateSuccess = true;
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const res = responseRecorder();

    // Use different resume to avoid cache hit
    const differentResume = { ...baseResume, summary: 'Unique summary for cache failure test' };

    await aiGateway({
      req: linkedInRequest(differentResume),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 503);
    assert.equal(res.payload.code, 'result_unavailable');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits,
      'No credits should be charged if cache update fails',
    );
    failUpdateSuccess = false;
  }

  // Test 4: Cached result retrieval returns zero additional credits and zero provider calls
  {
    failCreatePending = false;
    failUpdateSuccess = false;
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const res = responseRecorder();

    // Re-issue identical request as Test 2
    await aiGateway({
      req: linkedInRequest(),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.status, 'success');
    assert.equal(providerCalls, 0, 'Provider must NOT be called on cache hit');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits,
      'Zero credits must be charged on cache hit',
    );
  }

  // Test 5: Representative synchronous feature (career-assessment / enhance) behavior remains untouched
  {
    failCreatePending = false;
    failUpdateSuccess = false;
    providerCalls = 0;
    axios.post = async () => {
      providerCalls++;
      return {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({ score: 88, feedback: 'Strong profile' }),
            },
          }],
          usage: {},
        },
      };
    };

    const res = responseRecorder();
    await aiGateway({
      req: {
        headers: {},
        body: JSON.stringify({
          featureName: 'career-assessment',
          answers: ['Engineering'],
          __headers: { 'X-Appwrite-JWT': 'user-test-jwt' },
        }),
      },
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.status, 'success');
    assert.equal(providerCalls, 1);
  }

  // Test 6: Result-only read on pending execution returns 409 request_in_progress with 0 provider calls & 0 credits
  {
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const pendingResume = { ...baseResume, summary: 'Resume in flight for result-only pending test' };
    const res = responseRecorder();

    // Pre-seed a pending document in idempotency cache using computed key
    const key = aiGateway.__test.computeContentKeys('user-linkedin', 'optimize-for-linkedin', { featureName: 'optimize-for-linkedin', resume: pendingResume, region: 'global' })[0];
    collection('idempotency_cache').set('pending-doc-id', {
      $id: 'pending-doc-id',
      key,
      user_id: 'user-linkedin',
      feature: 'optimize-for-linkedin',
      status: 'pending',
      cached_result: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    await aiGateway({
      req: linkedInResultOnlyRequest(pendingResume),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 409);
    assert.equal(res.payload.code, 'request_in_progress');
    assert.equal(providerCalls, 0, 'Result-only mode must NEVER invoke AI providers on pending');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits,
      'No credits should be charged on result-only pending check',
    );
    collection('idempotency_cache').delete('pending-doc-id');
  }

  // Test 7: Result-only read on successful execution returns cached result with 0 provider calls & 0 credits
  {
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const res = responseRecorder();

    // Re-issue result-only request for Test 2's successful resume
    await aiGateway({
      req: linkedInResultOnlyRequest(baseResume),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.status, 'success');
    assert.ok(res.payload.data.headlines.length > 0);
    assert.equal(providerCalls, 0, 'Result-only mode must NEVER invoke AI providers on success hit');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits,
      'No credits should be charged on result-only cached read',
    );
  }

  // Test 8: Result-only read on failed background result returns stored failure with 0 provider calls & 0 credits
  {
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const failedResume = { ...baseResume, summary: 'Resume that failed background generation' };
    const res = responseRecorder();

    // Pre-seed a failed document in idempotency cache
    const key = aiGateway.__test.computeContentKeys('user-linkedin', 'optimize-for-linkedin', { featureName: 'optimize-for-linkedin', resume: failedResume, region: 'global' })[0];
    collection('idempotency_cache').set('failed-doc-id', {
      $id: 'failed-doc-id',
      key,
      user_id: 'user-linkedin',
      feature: 'optimize-for-linkedin',
      status: 'failed',
      has_result: true,
      cached_result: JSON.stringify({
        status: 'error',
        code: 'provider_unavailable',
        message: 'AI providers are temporarily unavailable. Please try again in a few minutes.',
        httpStatus: 503,
      }),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

    await aiGateway({
      req: linkedInResultOnlyRequest(failedResume),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 503);
    assert.equal(res.payload.code, 'provider_unavailable');
    assert.equal(providerCalls, 0, 'Result-only mode must NEVER invoke AI providers on failed hit');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits,
      'No credits should be charged on result-only failure retrieval',
    );
    // Verify failed doc is cleaned up so user can retry
    assert.equal(collection('idempotency_cache').has('failed-doc-id'), false);
  }

  // Test 9: Result-only read on missing result returns 503 result_unavailable with 0 provider calls & 0 credits
  {
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const missingResume = { ...baseResume, summary: 'Resume with zero idempotency cache record' };
    const res = responseRecorder();

    await aiGateway({
      req: linkedInResultOnlyRequest(missingResume),
      res,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });

    assert.equal(res.statusCode, 503);
    assert.equal(res.payload.code, 'result_unavailable');
    assert.equal(providerCalls, 0, 'Result-only mode must NEVER invoke AI providers on missing cache');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits,
      'No credits should be charged on result-only missing record',
    );
  }

  // Test 10: Explicit later retry after surfaced failure starts a fresh successful generation
  {
    providerCalls = 0;
    const initialCredits = collection('ai_credits').get('credits-linkedin').total_usage;
    const retryResume = { ...baseResume, summary: 'Resume that failed previously but user now retries' };

    // 1. Initial attempt fails and leaves failed idempotency record
    axios.post = async () => {
      providerCalls++;
      const err = new Error('Simulated upstream provider outage');
      err.response = { status: 503, data: { error: { message: 'Outage' } } };
      throw err;
    };

    const res1 = responseRecorder();
    await aiGateway({
      req: linkedInRequest(retryResume),
      res: res1,
      log() {},
      error(m) { /* expected failure */ },
    });
    assert.equal(res1.statusCode, 503);
    assert.equal(providerCalls, 2, 'Initial attempt exhausts primary and fallback candidates');

    // 2. Result-only reader reads the failure cleanly (0 provider calls)
    const res2 = responseRecorder();
    await aiGateway({
      req: linkedInResultOnlyRequest(retryResume),
      res: res2,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });
    assert.equal(res2.statusCode, 503);
    assert.equal(res2.payload.code, 'provider_unavailable');
    assert.equal(providerCalls, 2, 'Result-only read must not trigger any provider calls');

    // 3. User later clicks retry (normal request without X-AI-Result-Only) -> Provider is back up
    axios.post = async () => {
      providerCalls++;
      return successfulLinkedInResponse;
    };

    const res3 = responseRecorder();
    await aiGateway({
      req: linkedInRequest(retryResume),
      res: res3,
      log() {},
      error(m) { console.error('ERROR_LOG:', m); },
    });
    assert.equal(res3.statusCode, 200);
    assert.equal(res3.payload.status, 'success');
    assert.equal(providerCalls, 3, 'Normal retry calls primary provider once and succeeds');
    assert.equal(
      collection('ai_credits').get('credits-linkedin').total_usage,
      initialCredits + 1,
      'Exactly 1 credit should be charged after successful retry',
    );
  }

  console.log('✓ All AI Gateway LinkedIn durability and credit safety tests passed!');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});



