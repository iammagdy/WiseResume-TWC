const assert = require('node:assert/strict');
const path = require('node:path');

const collections = new Map();
let nextId = 1;
let updatedAt = 1;

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
    return { $id: 'user-1', email: 'qa@example.com', labels: [] };
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

collection('subscriptions').set('subscription-1', {
  $id: 'subscription-1',
  user_id: 'user-1',
  effective_plan: 'premium',
});
collection('ai_credits').set('credits-1', {
  $id: 'credits-1',
  $updatedAt: 'updated-0',
  user_id: 'user-1',
  daily_usage: 0,
  total_usage: 0,
  usage_date: new Date().toISOString().slice(0, 10),
});

const axios = require(require.resolve('axios', {
  paths: [gatewayModulePath],
}));
const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

const baseResume = {
  summary: 'Original summary',
  skills: ['JavaScript'],
  experience: [{
    id: 'exp-1',
    company: 'Acme',
    position: 'Engineer',
    startDate: '2022-01',
    endDate: '',
    current: true,
    description: 'Built software.',
    achievements: ['Improved delivery.'],
  }],
  education: [],
  projects: [],
  certifications: [],
  awards: [],
};

const successfulProviderResponse = {
  data: {
    choices: [{
      message: {
        content: JSON.stringify({
          summary: 'Tailored summary',
          skills: ['JavaScript', 'Node.js'],
          experience: [{
            id: 'exp-1',
            company: 'Acme',
            position: 'Engineer',
            startDate: '2022-01',
            endDate: '',
            current: true,
            description: 'Built production software.',
            achievements: ['Improved delivery by 20%.'],
          }],
          education: [],
          projects: [],
          certifications: [],
          awards: [],
          keyChanges: ['Aligned summary and experience.'],
          overallScore: { before: 55, after: 82 },
        }),
      },
    }],
    usage: {},
  },
};

function request(jobDescription, extraHeaders = {}) {
  return {
    headers: {},
    body: JSON.stringify({
      featureName: 'tailor-resume',
      resume: baseResume,
      jobDescription,
      intensity: 'moderate',
      __headers: {
        'X-Appwrite-JWT': 'user-test-jwt',
        ...extraHeaders,
      },
    }),
  };
}

function invoke(jobDescription, extraHeaders) {
  return aiGateway({
    req: request(jobDescription, extraHeaders),
    res: { json: (body, status = 200) => ({ body, status }) },
    log: () => {},
    error: () => {},
  });
}

function timeoutError() {
  const error = new Error('timeout exceeded');
  error.code = 'ECONNABORTED';
  return error;
}

async function run() {
  const providerCalls = [];
  axios.post = async (_url, _body, config) => {
    providerCalls.push(config.timeout);
    if (providerCalls.length === 1) throw timeoutError();
    return successfulProviderResponse;
  };

  const fallbackSuccess = await invoke('Role A requires Node.js and reliable systems experience.');
  assert.equal(fallbackSuccess.status, 200);
  assert.equal(fallbackSuccess.body.status, 'success');
  assert.deepEqual(providerCalls, [42_000, 23_000], 'provider attempts should use the bounded primary/fallback deadlines');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 2);

  const cachedReplay = await invoke('Role A requires Node.js and reliable systems experience.');
  assert.equal(cachedReplay.status, 200);
  assert.equal(cachedReplay.body.status, 'success');
  assert.equal(providerCalls.length, 2, 'a replay should use the cached result without another provider call');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 2, 'a replay must not deduct credit twice');

  axios.post = async () => { throw timeoutError(); };
  const boundedFailure = await invoke('Role B requires distributed systems and incident response ownership.');
  assert.equal(boundedFailure.status, 504);
  assert.equal(boundedFailure.body.code, 'provider_unavailable');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 2, 'failed Tailoring must not deduct credit');

  axios.post = async () => successfulProviderResponse;
  const explicitRetry = await invoke('Role B requires distributed systems and incident response ownership.');
  assert.equal(explicitRetry.status, 200, 'a user retry after bounded failure should be allowed');
  assert.equal(explicitRetry.body.status, 'success');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 4);

  let releaseProvider;
  axios.post = () => new Promise((resolve) => { releaseProvider = () => resolve(successfulProviderResponse); });
  const firstInFlight = invoke('Role C requires platform engineering leadership and observability expertise.');
  while (!releaseProvider) await Promise.resolve();
  const duplicate = await invoke('Role C requires platform engineering leadership and observability expertise.');
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, 'request_in_progress');
  releaseProvider();
  const completed = await firstInFlight;
  assert.equal(completed.status, 200);
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 6, 'concurrent duplicates must result in one credit deduction');

  const resultOnly = await invoke(
    'Role C requires platform engineering leadership and observability expertise.',
    {
      'X-Tailor-Result-Only': 'true',
      'X-Tailor-Execution-Status': 'completed',
      'X-Tailor-Execution-Http-Status': '200',
    },
  );
  assert.equal(resultOnly.status, 200);
  assert.equal(resultOnly.body.status, 'success');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 6, 'result retrieval must not deduct another credit');

  let malformedCalls = 0;
  axios.post = async () => {
    malformedCalls += 1;
    return { data: { choices: [{ message: { content: 'not valid Tailoring JSON' } }], usage: {} } };
  };
  const noResult = await invoke('Role D requires data platform ownership and measurable delivery outcomes.');
  assert.equal(noResult.status, 500);
  assert.equal(noResult.body.code, 'invalid_ai_response');
  assert.equal(malformedCalls, 2, 'malformed output should use only the bounded cross-provider fallback');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 6, 'an unusable result must not deduct credit');

  const noResultRetrieval = await invoke(
    'Role D requires data platform ownership and measurable delivery outcomes.',
    {
      'X-Tailor-Result-Only': 'true',
      'X-Tailor-Execution-Status': 'completed',
      'X-Tailor-Execution-Http-Status': '500',
    },
  );
  assert.equal(noResultRetrieval.status, 500);
  assert.equal(noResultRetrieval.body.code, 'invalid_ai_response');
  assert.equal(malformedCalls, 2, 'result-only recovery must not invoke a provider');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 6);

  axios.post = async () => successfulProviderResponse;
  const noResultRetry = await invoke('Role D requires data platform ownership and measurable delivery outcomes.');
  assert.equal(noResultRetry.status, 200, 'a user retry after unusable output should be allowed');
  assert.equal(collection('ai_credits').get('credits-1').daily_usage, 8);

  console.log('[TEST] Tailoring recovery, fallback, retry, and credit tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
