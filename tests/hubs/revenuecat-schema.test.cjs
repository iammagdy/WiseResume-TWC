'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const schema = require('../../scripts/setup_revenuecat_schema.cjs');

test('defines exactly the approved additive server-only collections', () => {
  assert.deepEqual(schema.COLLECTION_SPECS.map(spec => spec.id), [
    'revenuecat_subscription_state',
    'revenuecat_event_ledger',
  ]);
  for (const spec of schema.COLLECTION_SPECS) {
    assert.equal(spec.attributes.find(attribute => attribute.key === 'user_id')?.required, spec.id.endsWith('state'));
    assert.ok(spec.indexes.length > 0);
  }
  const state = schema.COLLECTION_SPECS.find(spec => spec.id === 'revenuecat_subscription_state');
  assert.equal(state.indexes.find(index => index.key === 'user_id_unique')?.type, 'unique');
});

test('provider state and event ledger contracts are durable and browser-write-free', () => {
  const state = schema.COLLECTION_SPECS.find(spec => spec.id === 'revenuecat_subscription_state');
  const ledger = schema.COLLECTION_SPECS.find(spec => spec.id === 'revenuecat_event_ledger');
  assert.deepEqual(state.attributes.find(attribute => attribute.key === 'plan'), { key: 'plan', type: 'string', size: 16, required: true, array: false });
  assert.ok(state.attributes.some(attribute => attribute.key === 'latest_event_timestamp_ms'));
  assert.deepEqual(state.indexes.find(index => index.key === 'user_id_unique'), { key: 'user_id_unique', type: 'unique', attributes: ['user_id'], orders: ['ASC'] });
  assert.equal(ledger.indexes.find(index => index.key === 'event_id_unique').type, 'unique');
  assert.ok(ledger.attributes.some(attribute => attribute.key === 'processing_status'));
  assert.ok(ledger.attributes.some(attribute => attribute.key === 'expires_at'));
  assert.doesNotThrow(() => schema.assertServerOnlyCollection({ $permissions: [], documentSecurity: false }, 'test'));
  assert.throws(() => schema.assertServerOnlyCollection({ $permissions: ['read("any")'], documentSecurity: false }, 'test'));
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
