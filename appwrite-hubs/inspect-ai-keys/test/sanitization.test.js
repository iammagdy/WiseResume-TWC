'use strict';

const assert = require('assert');
const { maskKey, sanitizeText, pingSlot } = require('../src/main.js')._internal;

async function runTests() {
  console.log('Testing inspect-ai-keys sanitization and status mapping...');

  // 1. Key masking tests
  assert.strictEqual(maskKey('sk-1234567890abcdef'), '****cdef');
  assert.strictEqual(maskKey('short'), '****hort');
  assert.strictEqual(maskKey(''), null);
  assert.strictEqual(maskKey(null), null);
  console.log('✓ Key masking tests passed');

  // 2. Text sanitization tests (no raw keys / auth headers)
  const sensitiveString = 'Error: Authorization: Bearer sk-secret1234567890 failed';
  const sanitized = sanitizeText(sensitiveString);
  assert.ok(!sanitized.includes('sk-secret1234567890'), 'Raw key must not be present');
  assert.ok(sanitized.includes('[MASKED]'), 'Masked placeholder must replace raw key');
  console.log('✓ Text sanitization tests passed');

  // 3. Status mapping: missing key
  const missingKeyRes = await pingSlot({ provider: 'openrouter', slot: 3, model: 'test-model' });
  assert.strictEqual(missingKeyRes.ok, false);
  assert.strictEqual(missingKeyRes.status, 'missing_key');
  assert.strictEqual(missingKeyRes.keyPreview, null);
  assert.ok(!JSON.stringify(missingKeyRes).includes('Bearer'), 'No bearer header in response');
  console.log('✓ Missing key status mapping tests passed');

  // 4. Status mapping: invalid provider
  const invalidProviderRes = await pingSlot({ provider: 'unknown-provider', slot: 1, model: 'test-model' });
  assert.strictEqual(invalidProviderRes.ok, false);
  assert.strictEqual(invalidProviderRes.status, 'missing_key'); // missing env key for invalid provider
  console.log('✓ Invalid provider handling passed');

  console.log('\nAll inspect-ai-keys sanitization unit tests passed successfully!\n');
}

runTests().catch(err => {
  console.error('✗ Test failure:', err);
  process.exit(1);
});
