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
  }
}

run()
  .then(() => console.log('[TEST] portfolio password verification passed'))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
