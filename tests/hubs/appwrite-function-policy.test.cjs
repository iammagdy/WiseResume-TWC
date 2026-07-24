'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const manifest = require('../../appwrite.json');
const {
  FUNCTION_EXECUTION_POLICIES,
  assertFunctionPolicyCoverage,
  parseExplicitHubTargets,
} = require('../../scripts/appwrite-function-policy.cjs');

const manifestIds = manifest.functions.map(fn => fn.functionId);

test('every deployable Appwrite function has one explicit execution policy', () => {
  assert.equal(manifestIds.length, 28);
  assert.doesNotThrow(() => assertFunctionPolicyCoverage(manifestIds));
});

test('job-feed-sync is schedule/internal-only while required public functions remain public', () => {
  assert.deepEqual(FUNCTION_EXECUTION_POLICIES['job-feed-sync'].execute, []);
  for (const id of [
    'portfolio-gate',
    'get-public-portfolio',
    'verify-portfolio-password',
    'track-visitor-event',
    'public-share',
    'email-service',
  ]) {
    assert.deepEqual(FUNCTION_EXECUTION_POLICIES[id].execute, ['any'], id);
  }
});

test('authenticated and admin functions are limited to authenticated Appwrite users', () => {
  for (const [id, policy] of Object.entries(FUNCTION_EXECUTION_POLICIES)) {
    if (policy.classification === 'authenticated-user' || policy.classification === 'admin-only') {
      assert.deepEqual(policy.execute, ['users'], id);
    }
  }
});

test('deployment target parser requires explicit known targets and rejects all', () => {
  assert.deepEqual(parseExplicitHubTargets('ai-gateway,job-import'), ['ai-gateway', 'job-import']);
  assert.throws(() => parseExplicitHubTargets(''), /explicit Appwrite hub target/i);
  assert.throws(() => parseExplicitHubTargets('all'), /target=all is prohibited/i);
  assert.throws(() => parseExplicitHubTargets('not-a-hub'), /Unknown Appwrite hub target/i);
});
