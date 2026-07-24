const assert = require('assert');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const getPublicPortfolio = require('../../appwrite-hubs/get-public-portfolio/src/main.js');
const verifyPortfolioPassword = require('../../appwrite-hubs/verify-portfolio-password/src/main.js');

async function run() {
  const password = 'correct horse battery staple';
  const wrongPassword = 'not the password';
  const bcryptHash = await bcrypt.hash(password, 4);
  const rawSha = crypto.createHash('sha256').update(password).digest('hex');
  const prefixedSha = `sha256:${rawSha}`;

  for (const [name, mod] of [
    ['get-public-portfolio', getPublicPortfolio],
    ['verify-portfolio-password', verifyPortfolioPassword],
  ]) {
    assert.equal(
      typeof mod.__test?.verifyStoredPassword,
      'function',
      `${name} should expose verifyStoredPassword for regression tests`,
    );

    assert.equal(await mod.__test.verifyStoredPassword(password, bcryptHash), true, `${name} should accept bcrypt hashes`);
    assert.equal(await mod.__test.verifyStoredPassword(wrongPassword, bcryptHash), false, `${name} should reject wrong bcrypt passwords`);
    assert.equal(await mod.__test.verifyStoredPassword(password, rawSha), true, `${name} should accept legacy raw SHA-256 hashes`);
    assert.equal(await mod.__test.verifyStoredPassword(password, prefixedSha), true, `${name} should accept legacy sha256: hashes`);
    assert.equal(await mod.__test.verifyStoredPassword(password, ''), false, `${name} should fail closed when the stored hash is missing`);

    assert.equal(
      mod.__test.getClientIp({ headers: { 'x-appwrite-client-ip': '203.0.113.7', 'x-forwarded-for': '127.0.0.1' } }),
      '203.0.113.7',
      `${name} should trust only Appwrite's platform client IP`,
    );
    assert.equal(
      mod.__test.getClientIp({ headers: { 'x-forwarded-for': '203.0.113.9' } }),
      'unknown',
      `${name} should place missing platform identity in the shared unknown bucket`,
    );

    const unavailable = await mod.__test.getPasswordAttemptState({
      getDocument: async () => {
        const error = new Error('rate limit storage unavailable');
        error.code = 500;
        throw error;
      },
    }, 'owner', '203.0.113.7');
    assert.equal(unavailable.blocked, true, `${name} should fail closed when rate-limit storage is unavailable`);
    assert.equal(unavailable.infrastructureFailure, true);

    const missing = await mod.__test.getPasswordAttemptState({
      getDocument: async () => {
        const error = new Error('not found');
        error.code = 404;
        throw error;
      },
    }, 'owner', '203.0.113.7');
    assert.equal(missing.blocked, false, `${name} should treat a missing counter as a fresh bucket`);

    const locked = await mod.__test.getPasswordAttemptState({
      getDocument: async () => ({ count: 8, reset_at: new Date(Date.now() + 60_000).toISOString() }),
    }, 'owner', '203.0.113.7');
    assert.equal(locked.blocked, true, `${name} should lock at the password threshold`);

    const expired = await mod.__test.getPasswordAttemptState({
      getDocument: async () => ({ count: 8, reset_at: new Date(Date.now() - 60_000).toISOString() }),
    }, 'owner', '203.0.113.7');
    assert.equal(expired.blocked, false, `${name} should recover after the lockout window`);

    await assert.rejects(
      mod.__test.recordPasswordFailure({
        getDocument: async () => ({ count: 1, reset_at: new Date(Date.now() + 60_000).toISOString() }),
        updateDocument: async () => { throw new Error('write unavailable'); },
      }, 'owner', '203.0.113.7'),
      /write unavailable/,
      `${name} must fail closed when a failed password attempt cannot be recorded`,
    );

    let resetData;
    await mod.__test.clearPasswordFailures({
      updateDocument: async (_db, _collection, _id, data) => { resetData = data; },
    }, 'owner', '203.0.113.7');
    assert.equal(resetData.count, 0, `${name} should reset the counter after a valid password`);
  }
}

run()
  .then(() => console.log('[TEST] portfolio password verification passed'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
