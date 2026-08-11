'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '../../appwrite-hubs/email-service/src/main.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const service = require(sourcePath);
const { requestUserEmailVerification, resendSend } = service._test;

async function withMockFetch(mock, run) {
  const originalFetch = global.fetch;
  global.fetch = mock;
  try {
    await run();
  } finally {
    global.fetch = originalFetch;
  }
}

async function testOfficialVerificationRequest() {
  let calls = 0;
  await withMockFetch(async (url, options) => {
    calls += 1;
    assert.match(url, /\/account\/verifications\/email$/);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['X-Appwrite-JWT'], 'test-user-jwt');
    return { ok: true, status: 201, text: async () => '{"$id":"verification"}' };
  }, async () => {
    const result = await requestUserEmailVerification({
      userJwt: 'test-user-jwt',
      redirectUrl: 'https://wiseresume.app/auth/verify-email',
    });
    assert.equal(result, undefined, 'official request must not return token material');
  });
  assert.equal(calls, 1, 'each verification click must create exactly one Appwrite request');
}

async function testOfficialVerificationFailure() {
  await withMockFetch(async () => ({
    ok: false,
    status: 429,
    text: async () => '{"message":"Rate limit"}',
  }), async () => {
    await assert.rejects(
      requestUserEmailVerification({ userJwt: 'test-user-jwt', redirectUrl: 'https://wiseresume.app/auth/verify-email' }),
      /Rate limit/,
    );
  });
}

async function testResendSuccessAndFailure() {
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 'test-key';
  try {
    await withMockFetch(async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(options.method, 'POST');
      return { ok: true, status: 200, text: async () => '{"id":"message-id"}' };
    }, async () => {
      const result = await resendSend({ to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' });
      assert.equal(result.id, 'message-id');
    });

    await withMockFetch(async () => ({
      ok: false,
      status: 500,
      text: async () => '{"message":"provider rejected request"}',
    }), async () => {
      await assert.rejects(
        resendSend({ to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' }),
        /provider rejected request/,
      );
    });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
}

function testVerificationContract() {
  const handlerMatch = source.match(/async function handleSendVerification[\s\S]*?(?=async function handleSendPasswordReset)/);
  assert.ok(handlerMatch, 'send-verification handler should remain defined');
  const handler = handlerMatch[0];

  assert.match(handler, /if \(!userJwt\)[\s\S]*?Authentication required/);
  assert.match(handler, /userId = sessionUser\.\$id/);
  assert.match(handler, /emailVerification === true[\s\S]*?alreadyVerified: true/);
  assert.match(handler, /await requestUserEmailVerification\(\{ userJwt, redirectUrl \}\)/);
  assert.match(handler, /delivery: 'appwrite', providerAccepted: true/);
  assert.match(handler, /Verification email request was not accepted\. Please try again\./);
  assert.doesNotMatch(handler, /resendSend|verificationEmail|token\.secret|secret:/);
  assert.doesNotMatch(source, /\/users\/\$\{encodeURIComponent\(userId\)\}\/verification/);
  assert.doesNotMatch(source, /createEmailVerificationToken|createUserVerificationTokenOnce|buildVerificationUrl/);

  const requestMatch = source.match(/async function requestUserEmailVerification[\s\S]*?(?=\/\*\* Complete email verification)/);
  assert.ok(requestMatch, 'official Appwrite request helper should remain defined');
  const request = requestMatch[0];
  assert.ok(
    request.indexOf('if (res.ok) return') < request.indexOf('await res.text()'),
    'successful verification requests must not inspect a response body that could contain token material',
  );
}

async function main() {
  await testOfficialVerificationRequest();
  await testOfficialVerificationFailure();
  await testResendSuccessAndFailure();
  testVerificationContract();
  console.log('[TEST] email-service official verification contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
