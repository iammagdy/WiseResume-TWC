'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const schema = require('../../scripts/setup_paypal_schema.cjs');

test('defines exactly the approved additive server-only PayPal collections', () => {
  assert.deepEqual(schema.COLLECTION_SPECS.map(spec => spec.id), [
    'paypal_subscription_state',
    'paypal_event_ledger',
  ]);
  for (const spec of schema.COLLECTION_SPECS) {
    assert.equal(spec.attributes.find(attribute => attribute.key === 'user_id')?.required, spec.id.endsWith('state'));
    assert.ok(spec.indexes.length > 0);
  }
  const state = schema.COLLECTION_SPECS.find(spec => spec.id === 'paypal_subscription_state');
  assert.equal(state.indexes.find(index => index.key === 'user_id_unique')?.type, 'unique');
  assert.equal(state.indexes.find(index => index.key === 'subscription_id_idx')?.type, 'key');
});

test('PayPal provider state and event ledger contracts are durable, browser-write-free, and omit payer_id', () => {
  const state = schema.COLLECTION_SPECS.find(spec => spec.id === 'paypal_subscription_state');
  const ledger = schema.COLLECTION_SPECS.find(spec => spec.id === 'paypal_event_ledger');

  // Explicit privacy boundary: payer_id must NOT be stored
  assert.equal(state.attributes.find(attribute => attribute.key === 'payer_id'), undefined);
  assert.equal(ledger.attributes.find(attribute => attribute.key === 'payer_id'), undefined);

  // Field contracts
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'plan'), { key: 'plan', type: 'string', size: 16, required: true, array: false });
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'subscription_id'), { key: 'subscription_id', type: 'string', size: 64, required: true, array: false });
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'plan_id'), { key: 'plan_id', type: 'string', size: 64, required: true, array: false });
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'environment'), { key: 'environment', type: 'string', size: 16, required: true, array: false });
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'status'), { key: 'status', type: 'string', size: 32, required: true, array: false });
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'expires_at'), { key: 'expires_at', type: 'string', size: 32, required: false, array: false });
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'will_renew'), { key: 'will_renew', type: 'boolean', required: false, array: false, default: true });
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'grace_period_expires_at'), { key: 'grace_period_expires_at', type: 'string', size: 32, required: false, array: false });
  assert.ok(state.attributes.some(attribute => attribute.key === 'latest_event_timestamp_ms'));

  // Index contracts
  assert.deepEqual(state.indexes.find(index => index.key === 'user_id_unique'), { key: 'user_id_unique', type: 'unique', attributes: ['user_id'], orders: ['ASC'] });
  assert.deepEqual(state.indexes.find(index => index.key === 'subscription_id_idx'), { key: 'subscription_id_idx', type: 'key', attributes: ['subscription_id'], orders: ['ASC'] });
  assert.equal(ledger.indexes.find(index => index.key === 'event_id_unique').type, 'unique');
  assert.ok(ledger.attributes.some(attribute => attribute.key === 'processing_status'));
  assert.ok(ledger.attributes.some(attribute => attribute.key === 'expires_at'));

  // Server-only security assertions
  assert.doesNotThrow(() => schema.assertServerOnlyCollection({ $permissions: [], documentSecurity: false }, 'test'));
  assert.throws(() => schema.assertServerOnlyCollection({ $permissions: ['read("any")'], documentSecurity: false }, 'test'));
  assert.throws(() => schema.assertServerOnlyCollection({ $permissions: ['read("users")'], documentSecurity: false }, 'test'));
  assert.throws(() => schema.assertServerOnlyCollection({ $permissions: [], documentSecurity: true }, 'test'));
});

test('compatibility checks are fail-closed and do not silently accept incompatible objects', () => {
  const attribute = schema.COLLECTION_SPECS[0].attributes.find(item => item.key === 'plan');
  assert.equal(schema.attributeCompatibilityError(attribute, attribute, 'state'), null);
  assert.match(schema.attributeCompatibilityError({ ...attribute, required: false }, attribute, 'state'), /required false/);
  const index = schema.COLLECTION_SPECS[1].indexes[0];
  assert.equal(schema.indexCompatibilityError(index, index, 'ledger'), null);
  assert.match(schema.indexCompatibilityError({ ...index, type: 'key' }, index, 'ledger'), /type key/);
});
