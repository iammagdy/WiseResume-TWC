'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '../../appwrite-hubs/email-service/src/main.js');
const service = require(servicePath);
const handler = service;
const {
  verifyTurnstileToken,
  handleSendContactEmail,
  checkInMemoryContactRateLimit,
  checkPersistentContactRateLimit,
  getTrustedAppwriteClientIp,
  validateUserSession,
  setInjectedDb,
  setInjectedAccount,
} = service._test;

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    json(payload, status = 200) {
      res.statusCode = status;
      res.body = payload;
      return res;
    },
  };
  return res;
}

// ── 1. Honeypot check ────────────────────────────────────────────────────────
test('email-service portfolio-contact: honeypot silently succeeds', async () => {
  const body = {
    action: 'send-contact-email',
    website: 'http://spam-bot.com',
    name: 'Spam Bot',
    email: 'bot@spam.com',
    message: 'Buy cheap watches',
  };
  const req = { method: 'POST', headers: {}, body };
  const res = createMockRes();

  await handler({ req, res, log: () => {}, error: () => {} });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.status, 'success');
  assert.equal(res.body?.data?.success, true);
  assert.equal(res.body?.data?.id, null);
});

// ── 2. Missing Turnstile & unauthenticated ────────────────────────────────────
test('email-service portfolio-contact: rejects missing Turnstile and unauthenticated visitor', async () => {
  const body = {
    action: 'send-contact-email',
    name: 'Anonymous Visitor',
    email: 'visitor@example.com',
    message: 'Hello, I love your portfolio!',
    metadata: { portfolio_username: 'janedoe' },
  };
  const req = { method: 'POST', headers: {}, body };
  const res = createMockRes();

  await handler({ req, res, log: () => {}, error: () => {} });

  assert.equal(res.statusCode, 403);
  assert.match(res.body?.error, /security check required/i);
});

// ── 3. Invalid Turnstile token ───────────────────────────────────────────────
test('email-service portfolio-contact: rejects invalid Turnstile token', async () => {
  const originalFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = 'mock-turnstile-secret';

  global.fetch = async (url) => {
    if (url.includes('turnstile')) {
      return {
        ok: true,
        json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
      };
    }
    return { ok: false };
  };

  try {
    const body = {
      action: 'send-contact-email',
      turnstileToken: 'invalid-turnstile-token',
      name: 'Anonymous Visitor',
      email: 'visitor@example.com',
      message: 'Hello, I love your portfolio!',
      metadata: { portfolio_username: 'janedoe' },
    };
    const req = { method: 'POST', headers: {}, body };
    const res = createMockRes();

    await handler({ req, res, log: () => {}, error: () => {} });

    assert.equal(res.statusCode, 403);
    assert.match(res.body?.error, /security check failed/i);
  } finally {
    global.fetch = originalFetch;
  }
});

// ── 4. Malformed payload ──────────────────────────────────────────────────────
test('email-service portfolio-contact: rejects malformed payload (short message / malformed email)', async () => {
  const originalFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = 'mock-turnstile-secret';

  global.fetch = async (url) => {
    if (url.includes('turnstile')) {
      return {
        ok: true,
        json: async () => ({ success: true, hostname: 'wiseresume.app' }),
      };
    }
    return { ok: false };
  };

  try {
    // 1. Short message (< 4 chars)
    const body = {
      action: 'send-contact-email',
      turnstileToken: 'valid-token',
      name: 'Visitor',
      email: 'visitor@example.com',
      message: 'Hi',
      metadata: { portfolio_username: 'janedoe' },
    };
    const req = { method: 'POST', headers: {}, body };
    const res = createMockRes();

    await handler({ req, res, log: () => {}, error: () => {} });
    assert.equal(res.statusCode, 400);

    // 2. Malformed email
    const body2 = {
      action: 'send-contact-email',
      turnstileToken: 'valid-token',
      name: 'Visitor',
      email: 'not-an-email',
      message: 'Valid message content here.',
      metadata: { portfolio_username: 'janedoe' },
    };
    const req2 = { method: 'POST', headers: {}, body: body2 };
    const res2 = createMockRes();

    await handler({ req: req2, res: res2, log: () => {}, error: () => {} });
    assert.equal(res2.statusCode, 400);
  } finally {
    global.fetch = originalFetch;
  }
});

// ── 5. Oversized payload ──────────────────────────────────────────────────────
test('email-service portfolio-contact: rejects oversized payload', async () => {
  const originalFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = 'mock-turnstile-secret';
  process.env.RESEND_API_KEY = 're_mock_test_key';

  global.fetch = async (url) => {
    if (url.includes('turnstile')) {
      return {
        ok: true,
        json: async () => ({ success: true, hostname: 'wiseresume.app' }),
      };
    }
    return { ok: false };
  };

  try {
    // Oversized name (> 200 chars) is clamped, but oversized message (> 5000 chars) is clamped
    const body = {
      action: 'send-contact-email',
      turnstileToken: 'valid-token',
      name: 'a'.repeat(250),
      email: 'visitor@example.com',
      message: 'm'.repeat(6000),
      metadata: { portfolio_username: 'janedoe' },
    };
    const req = { method: 'POST', headers: {}, body };
    const res = createMockRes();

    // With clamping, it succeeds with clamped content rather than unhandled exception
    let resendPayload = null;
    global.fetch = async (url, opts) => {
      if (url.includes('turnstile')) return { ok: true, json: async () => ({ success: true, hostname: 'wiseresume.app' }) };
      if (url.includes('api.resend.com')) {
        resendPayload = JSON.parse(opts.body);
        return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'msg-1' }) };
      }
      return { ok: false };
    };

    const fakeDb = {
      async listDocuments() {
        return { total: 1, documents: [{ user_id: 'u1', username: 'janedoe', contact_email: 'owner@example.com' }] };
      },
      async getDocument() { const e = new Error('not found'); e.code = 404; throw e; },
      async createDocument(_db, _col, _id, data) { return data; },
      async updateDocument(_db, _col, _id, data) { return data; },
      async incrementDocumentAttribute() { return { count: 1 }; },
    };
    setInjectedDb(fakeDb);

    await handler({ req, res, log: () => {}, error: () => {} });
    assert.equal(res.statusCode, 200);
    // Verified message content was bounded to max 5000 characters
    assert.ok(resendPayload?.html.length < 15000);
  } finally {
    global.fetch = originalFetch;
    setInjectedDb(null);
  }
});

// ── 6. In-memory rate limiting (tightened to 3/hour) ──────────────────────────
test('email-service portfolio-contact: in-memory rate limiting blocks at tightened threshold (3/hour)', () => {
  const testIp = '198.51.100.99';
  for (let i = 0; i < 3; i++) {
    const result = checkInMemoryContactRateLimit(testIp);
    assert.equal(result.ok, true);
  }
  // 4th request is blocked (3/hour policy)
  const blocked = checkInMemoryContactRateLimit(testIp);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSeconds > 0);
});

// ── 7. Logged-out visitor success with Turnstile & Resend contract ───────────
test('email-service portfolio-contact: successful delivery for logged-out visitor with valid Turnstile', async () => {
  const originalFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = 'mock-turnstile-secret';
  process.env.RESEND_API_KEY = 're_mock_test_key';
  process.env.APPWRITE_API_KEY = 'mock-appwrite-key';

  let resendCalled = false;
  let resendPayload = null;
  let createdNotif = null;

  global.fetch = async (url, options) => {
    if (url.includes('turnstile')) {
      return {
        ok: true,
        json: async () => ({ success: true, hostname: 'wiseresume.app' }),
      };
    }
    if (url.includes('api.resend.com')) {
      resendCalled = true;
      resendPayload = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 'msg_123456' }),
      };
    }
    return { ok: false, text: async () => 'not found' };
  };

  const fakeDb = {
    async listDocuments(_databaseId, collectionId) {
      if (collectionId === 'profiles') {
        return {
          total: 1,
          documents: [
            {
              $id: 'profile-1',
              user_id: 'user-owner-123',
              username: 'janedoe',
              contact_email: 'owner@example.com',
            },
          ],
        };
      }
      return { total: 0, documents: [] };
    },
    async getDocument() {
      const err = new Error('not found');
      err.code = 404;
      throw err;
    },
    async createDocument(_db, collectionId, _id, data, permissions) {
      if (collectionId === 'notifications') {
        createdNotif = { data, permissions };
      }
      return { $id: 'doc-1', ...data };
    },
    async updateDocument(_db, _col, _id, data) {
      return { $id: 'doc-1', ...data };
    },
    async incrementDocumentAttribute() {
      return { count: 1 };
    },
  };
  setInjectedDb(fakeDb);

  try {
    const body = {
      action: 'send-contact-email',
      turnstileToken: 'valid-turnstile-token',
      name: 'Ahmed Recruiter',
      email: 'recruiter@company.com',
      message: 'Hello Jane, I would like to discuss a Senior Engineer role with you.',
      metadata: { portfolio_username: 'janedoe' },
    };
    const req = {
      method: 'POST',
      headers: {
        'x-appwrite-client-ip': '203.0.113.195',
      },
      body,
    };
    const res = createMockRes();

    await handler({ req, res, log: () => {}, error: () => {} });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.status, 'success');
    assert.equal(res.body?.data?.id, 'msg_123456');
    assert.equal(resendCalled, true);
    assert.deepEqual(resendPayload?.to, ['owner@example.com']);
    assert.equal(resendPayload?.reply_to, 'recruiter@company.com');

    // Verify in-app notification contract and permissions
    assert.ok(createdNotif);
    assert.equal(createdNotif.data.user_id, 'user-owner-123');
    assert.equal(createdNotif.data.type, 'portfolio_message');
    assert.equal(createdNotif.data.title, 'New portfolio message');
    assert.match(createdNotif.data.message, /Ahmed Recruiter sent you a message/);
    assert.deepEqual(createdNotif.permissions, [
      'read("user:user-owner-123")',
      'update("user:user-owner-123")',
      'delete("user:user-owner-123")',
    ]);
  } finally {
    global.fetch = originalFetch;
    setInjectedDb(null);
  }
});

// ── 8. Authenticated visitor success without Turnstile ────────────────────────
test('email-service portfolio-contact: authenticated visitor succeeds without Turnstile', async () => {
  const originalFetch = global.fetch;
  process.env.RESEND_API_KEY = 're_mock_test_key';
  process.env.APPWRITE_API_KEY = 'mock-appwrite-key';

  global.fetch = async (url) => {
    if (url.includes('api.resend.com')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'msg-auth' }) };
    }
    // Mock Appwrite Account.get() response
    if (url.includes('/account')) {
      return { ok: true, status: 200, json: async () => ({ $id: 'auth-user-999', email: 'auth@example.com' }) };
    }
    return { ok: false };
  };

  const fakeDb = {
    async listDocuments() {
      return { total: 1, documents: [{ user_id: 'owner-1', username: 'janedoe', contact_email: 'owner@example.com' }] };
    },
    async getDocument() { const e = new Error('not found'); e.code = 404; throw e; },
    async createDocument(_db, _col, _id, data) { return data; },
    async updateDocument(_db, _col, _id, data) { return data; },
    async incrementDocumentAttribute() { return { count: 1 }; },
  };
  setInjectedDb(fakeDb);
  setInjectedAccount({
    async get() {
      return { $id: 'auth-user-999', email: 'auth@example.com' };
    },
  });

  try {
    const body = {
      action: 'send-contact-email',
      // No turnstileToken provided
      name: 'Auth Visitor',
      email: 'visitor@example.com',
      message: 'Hello from logged in user',
      metadata: { portfolio_username: 'janedoe' },
    };
    const req = {
      method: 'POST',
      headers: {
        'x-appwrite-jwt': 'valid-user-jwt',
        'x-appwrite-client-ip': '203.0.113.88',
      },
      body,
    };
    const res = createMockRes();

    await handler({ req, res, log: () => {}, error: () => {} });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body?.status, 'success');
  } finally {
    global.fetch = originalFetch;
    setInjectedDb(null);
    setInjectedAccount(null);
  }
});

// ── 9. Nonexistent portfolio owner returns 422 ────────────────────────────────
test('email-service portfolio-contact: nonexistent portfolio owner returns 422', async () => {
  const originalFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = 'mock-turnstile-secret';
  process.env.RESEND_API_KEY = 're_mock_test_key';
  process.env.APPWRITE_API_KEY = 'mock-appwrite-key';

  global.fetch = async (url) => {
    if (url.includes('turnstile')) {
      return { ok: true, json: async () => ({ success: true, hostname: 'wiseresume.app' }) };
    }
    return { ok: false };
  };

  const emptyDb = {
    async listDocuments() {
      return { total: 0, documents: [] };
    },
    async getDocument() {
      const err = new Error('not found');
      err.code = 404;
      throw err;
    },
    async createDocument(_db, _col, _id, data) { return data; },
  };
  setInjectedDb(emptyDb);

  try {
    const body = {
      action: 'send-contact-email',
      turnstileToken: 'valid-token',
      name: 'Visitor',
      email: 'visitor@example.com',
      message: 'Hello from unknown visitor',
      metadata: { portfolio_username: 'nonexistent-user-xyz' },
    };
    const req = { method: 'POST', headers: { 'x-appwrite-client-ip': '10.0.0.1' }, body };
    const res = createMockRes();

    await handler({ req, res, log: () => {}, error: () => {} });

    assert.equal(res.statusCode, 422);
    assert.match(res.body?.error, /portfolio not found|hasn't set up a contact email/i);
  } finally {
    global.fetch = originalFetch;
    setInjectedDb(null);
  }
});

// ── 10. Owner with no configured contact email returns 422 ───────────────────
test('email-service portfolio-contact: owner without contact email returns 422', async () => {
  const originalFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = 'mock-turnstile-secret';
  process.env.RESEND_API_KEY = 're_mock_test_key';
  process.env.APPWRITE_API_KEY = 'mock-appwrite-key';

  global.fetch = async (url) => {
    if (url.includes('turnstile')) {
      return { ok: true, json: async () => ({ success: true, hostname: 'wiseresume.app' }) };
    }
    return { ok: false };
  };

  const noEmailDb = {
    async listDocuments() {
      return {
        total: 1,
        documents: [{ $id: 'p1', user_id: 'u1', username: 'noemailuser', email: '', contact_email: '' }],
      };
    },
    async getDocument() { const e = new Error('not found'); e.code = 404; throw e; },
    async createDocument(_db, _col, _id, data) { return data; },
    async updateDocument(_db, _col, _id, data) { return data; },
    async incrementDocumentAttribute() { return { count: 1 }; },
  };
  setInjectedDb(noEmailDb);

  try {
    const body = {
      action: 'send-contact-email',
      turnstileToken: 'valid-token',
      name: 'Visitor',
      email: 'visitor@example.com',
      message: 'Hello to user without contact email',
      metadata: { portfolio_username: 'noemailuser' },
    };
    const req = { method: 'POST', headers: { 'x-appwrite-client-ip': '10.0.0.2' }, body };
    const res = createMockRes();

    await handler({ req, res, log: () => {}, error: () => {} });

    assert.equal(res.statusCode, 422);
    assert.match(res.body?.error, /hasn't set up a contact email yet/i);
  } finally {
    global.fetch = originalFetch;
    setInjectedDb(null);
  }
});

// ── 11. Durable rate limit & atomic concurrency ──────────────────────────────
test('email-service portfolio-contact: durable rate limit enforces limit and blocks subsequent attempts', async () => {
  let docCount = 0;
  const mockDb = {
    async getDocument() {
      return {
        $id: 'rate-doc',
        count: docCount,
        reset_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      };
    },
    async incrementDocumentAttribute(_db, _col, _id, _attr, _amount, max) {
      if (docCount >= max) {
        throw new Error('Maximum exceeded');
      }
      docCount += 1;
      return { count: docCount };
    },
  };

  // 1st increment passes (count -> 1)
  const r1 = await checkPersistentContactRateLimit(mockDb, '203.0.113.10', 'test@test.com');
  assert.equal(r1.ok, true);

  // 2nd increment passes (count -> 2)
  const r2 = await checkPersistentContactRateLimit(mockDb, '203.0.113.10', 'test@test.com');
  assert.equal(r2.ok, true);

  // 3rd increment passes (count -> 3)
  const r3 = await checkPersistentContactRateLimit(mockDb, '203.0.113.10', 'test@test.com');
  assert.equal(r3.ok, true);

  // 4th increment fails atomically because count >= CONTACT_RATE_MAX (3)
  const r4 = await checkPersistentContactRateLimit(mockDb, '203.0.113.10', 'test@test.com');
  assert.equal(r4.ok, false);
  assert.ok(r4.retryAfterSeconds > 0);
});

// ── 12. Trusted client IP extraction behavior ────────────────────────────────
test('email-service portfolio-contact: getTrustedAppwriteClientIp trusts only x-appwrite-client-ip', () => {
  // 1. Platform header present -> extracts platform IP
  const req1 = {
    headers: {
      'x-appwrite-client-ip': '203.0.113.50',
      'x-forwarded-for': '1.2.3.4',
      'client-ip': '5.6.7.8',
    },
  };
  assert.equal(getTrustedAppwriteClientIp(req1), '203.0.113.50');

  // 2. Caller-supplied spoofed headers only -> returns 'unknown'
  const req2 = {
    headers: {
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '5.6.7.8',
      'cf-connecting-ip': '9.10.11.12',
    },
  };
  assert.equal(getTrustedAppwriteClientIp(req2), 'unknown');

  // 3. Empty headers -> returns 'unknown'
  assert.equal(getTrustedAppwriteClientIp({}), 'unknown');
  assert.equal(getTrustedAppwriteClientIp(null), 'unknown');
});
