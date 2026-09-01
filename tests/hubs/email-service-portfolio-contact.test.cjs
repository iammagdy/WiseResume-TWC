'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const servicePath = path.resolve(__dirname, '../../appwrite-hubs/email-service/src/main.js');
const service = require(servicePath);
const handler = service;
const {
  verifyTurnstileToken,
  handleSendPortfolioContactEmail,
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
    action: 'send-portfolio-contact-email',
    website: 'http://spam-bot.com',
    name: 'Spam Bot',
    email: 'bot@spam.com',
    message: 'Buy cheap watches',
    metadata: { portfolio_username: 'janedoe' },
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
    action: 'send-portfolio-contact-email',
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
      action: 'send-portfolio-contact-email',
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
      action: 'send-portfolio-contact-email',
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
      action: 'send-portfolio-contact-email',
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

// ── 5. Rejects unsupported actions & non-portfolio types ─────────────────────
test('email-service portfolio-contact: rejects generic actions and non-portfolio types', async () => {
  // 1. Calling generic 'send-contact-email' on email-service is rejected (hits default 400)
  const body1 = {
    action: 'send-contact-email',
    name: 'User',
    email: 'user@example.com',
    message: 'Bug report message',
    type: 'bug',
  };
  const req1 = { method: 'POST', headers: {}, body: body1 };
  const res1 = createMockRes();
  await handler({ req: req1, res: res1, log: () => {}, error: () => {} });
  assert.equal(res1.statusCode, 400);
  assert.match(res1.body?.error, /unsupported email request/i);

  // 2. Calling send-portfolio-contact-email with type="bug" or type="feature" is rejected
  const body2 = {
    action: 'send-portfolio-contact-email',
    name: 'User',
    email: 'user@example.com',
    message: 'I found a bug in the app',
    type: 'bug',
    metadata: { portfolio_username: 'janedoe' },
  };
  const req2 = { method: 'POST', headers: {}, body: body2 };
  const res2 = createMockRes();
  await handler({ req: req2, res: res2, log: () => {}, error: () => {} });
  assert.equal(res2.statusCode, 400);
  assert.match(res2.body?.error, /only portfolio contact messages are accepted/i);
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
      action: 'send-portfolio-contact-email',
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
      action: 'send-portfolio-contact-email',
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
    async incrementDocumentAttribute() { return { count: 1 }; },
  };
  setInjectedDb(emptyDb);

  try {
    const body = {
      action: 'send-portfolio-contact-email',
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
      action: 'send-portfolio-contact-email',
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

// ── 11. Concurrency test: simultaneous calls at new-window boundary ─────────
test('email-service portfolio-contact: time-bucket concurrency test covering simultaneous calls at new-window/reset boundary', async () => {
  // Simulate Appwrite database with atomic increment and duplicate-create handling
  const store = new Map();
  let duplicateCreates = 0;

  const mockDb = {
    async getDocument(_db, _col, id) {
      if (store.has(id)) return store.get(id);
      const err = new Error('not found');
      err.code = 404;
      throw err;
    },
    async createDocument(_db, _col, id, data) {
      if (store.has(id)) {
        duplicateCreates += 1;
        const err = new Error('document already exists');
        err.code = 409;
        throw err;
      }
      const doc = { $id: id, ...data };
      store.set(id, doc);
      return doc;
    },
    async incrementDocumentAttribute(_db, _col, id, _attr, amount, max) {
      const doc = store.get(id);
      if (!doc) throw new Error('doc not found');
      if (doc.count >= max) {
        throw new Error('Maximum exceeded');
      }
      doc.count += amount;
      return doc;
    },
  };

  // Launch 10 simultaneous requests at the exact same millisecond
  const testIp = '203.0.113.200';
  const testEmail = 'visitor@example.com';
  const results = await Promise.all(
    Array.from({ length: 10 }, () => checkPersistentContactRateLimit(mockDb, testIp, testEmail))
  );

  // Exactly 3 succeed (limit is 3), and 7 are throttled
  const successCount = results.filter((r) => r.ok === true).length;
  const blockedCount = results.filter((r) => r.ok === false).length;

  assert.equal(successCount, 3, 'Exactly 3 concurrent requests must be admitted');
  assert.equal(blockedCount, 7, 'Remaining 7 concurrent requests must be blocked');

  // Verify duplicate creation attempts were safely handled
  assert.ok(duplicateCreates > 0, 'Concurrent creates must race safely without unhandled error');

  // Verify all blocked results contain valid retryAfterSeconds
  const blocked = results.filter((r) => !r.ok);
  for (const b of blocked) {
    assert.ok(b.retryAfterSeconds > 0, 'Blocked responses must include retry interval');
  }
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
