'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const handler = require('../../appwrite-hubs/admin-sentry/src/main.js');

function invoke(req) {
  let response;
  return handler({
    req,
    res: { json: (payload, status) => { response = { payload, status }; return response; } },
    log: () => undefined,
    error: () => undefined,
  }).then(() => response);
}

test('admin-sentry accepts a correctly signed external webhook before any DevKit check', async () => {
  const previous = process.env.SENTRY_WEBHOOK_SECRET;
  process.env.SENTRY_WEBHOOK_SECRET = 'test-webhook-secret';
  try {
    const body = JSON.stringify({ action: 'created' });
    const signature = crypto.createHmac('sha256', process.env.SENTRY_WEBHOOK_SECRET).update(body).digest('hex');
    const result = await invoke({
      body,
      headers: { 'Sentry-Hook-Resource': 'event_alert', 'Sentry-Hook-Signature': signature },
      query: {},
    });
    assert.equal(result.status, 200);
    assert.equal(result.payload.success, true);
    assert.equal(result.payload.received, true);
  } finally {
    if (previous === undefined) delete process.env.SENTRY_WEBHOOK_SECRET;
    else process.env.SENTRY_WEBHOOK_SECRET = previous;
  }
});

test('admin-sentry rejects missing and invalid webhook signatures without privileged behavior', async () => {
  const previous = process.env.SENTRY_WEBHOOK_SECRET;
  process.env.SENTRY_WEBHOOK_SECRET = 'test-webhook-secret';
  try {
    for (const signature of ['', '00'.repeat(32)]) {
      const result = await invoke({
        body: JSON.stringify({ action: 'created' }),
        headers: { 'sentry-hook-resource': 'event_alert', 'sentry-hook-signature': signature },
        query: {},
      });
      assert.equal(result.status, 401);
      assert.equal(result.payload.error, 'Unauthorized');
    }
  } finally {
    if (previous === undefined) delete process.env.SENTRY_WEBHOOK_SECRET;
    else process.env.SENTRY_WEBHOOK_SECRET = previous;
  }
});

test('admin-sentry rejects an unsigned normal action and accepts a valid DevKit proof', async () => {
  const previous = process.env.APPWRITE_API_KEY;
  process.env.APPWRITE_API_KEY = 'test-devkit-key';
  try {
    const denied = await invoke({ body: { action: 'unknown' }, headers: {}, query: {} });
    assert.equal(denied.status, 401);

    const encoded = Buffer.from(JSON.stringify({ purpose: 'devkit', exp: Date.now() + 60_000 })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.APPWRITE_API_KEY).update(encoded).digest('base64url');
    const accepted = await invoke({
      body: { action: 'unknown' },
      headers: { authorization: `Bearer ${encoded}.${signature}` },
      query: {},
    });
    // It reaches the action layer (not an auth denial); no Sentry network call occurs.
    assert.equal(accepted.status, 503);
  } finally {
    if (previous === undefined) delete process.env.APPWRITE_API_KEY;
    else process.env.APPWRITE_API_KEY = previous;
  }
});

test('webhook signature verifier fails closed for malformed values', () => {
  assert.equal(handler.__test.verifyWebhookSig('{}', 'not-hex', 'test-webhook-secret'), false);
  assert.equal(handler.__test.verifyWebhookSig('{}', '00'.repeat(31), 'test-webhook-secret'), false);
});
