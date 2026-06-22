// Regression guard for P2-3: the admin hubs must NOT accept the raw
// DEVKIT_PASSWORD as a bearer token. Only short-lived signed DevKit tokens
// (verifySignedToken) are permitted. This inspects each hub's source so it
// fails loudly if the raw-password fallback is ever reintroduced.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HUBS = [
  'admin-impersonate',
  'admin-email',
  'admin-testmail',
  'admin-moderation',
  'admin-portfolio-usernames',
  'admin-visitor-analytics',
  'admin-onboarding-funnel',
  'admin-deploy-hubs',
  'inspect-ai-keys',
];

let failures = 0;
for (const hub of HUBS) {
  const file = path.join(__dirname, '..', '..', 'appwrite-hubs', hub, 'src', 'main.js');
  const src = fs.readFileSync(file, 'utf8');

  // The raw-password bearer comparison must be gone.
  if (/timingSafeStringEqual\s*\(\s*token\s*,\s*password\s*\)/.test(src)) {
    console.error(`[FAIL] ${hub}: still compares bearer token against raw DEVKIT_PASSWORD`);
    failures++;
  }
  if (/password\s*&&\s*timingSafeStringEqual/.test(src)) {
    console.error(`[FAIL] ${hub}: still has "password && timingSafeStringEqual" fallback`);
    failures++;
  }
  // Signed-token verification must still be the auth path.
  if (!/verifySignedToken\s*\(/.test(src)) {
    console.error(`[FAIL] ${hub}: no longer calls verifySignedToken`);
    failures++;
  }
}

assert.equal(failures, 0, `${failures} hub(s) still expose the raw DEVKIT_PASSWORD bearer fallback`);
console.log(`[TEST] devkit signed-token-only auth verified for ${HUBS.length} hubs`);
