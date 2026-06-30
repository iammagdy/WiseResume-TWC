'use strict';

const assert = require('node:assert/strict');
const { normalizeUserQuery, filterAndSortUsers } = require('../../appwrite-hubs/admin-devkit-data/src/user-query.cjs');

const query = normalizeUserQuery({
  page: 1,
  pageSize: 500,
  search: '  MAGDY ',
  sort: 'joined_asc',
  filters: { verification: 'verified', profile: 'missing', plan: 'pro' },
});
assert.deepEqual(query, {
  page: 1,
  pageSize: 100,
  search: 'magdy',
  sort: 'joined_asc',
  filters: { verification: 'verified', profile: 'missing', plan: 'pro' },
});

const users = [
  { $id: '2', email: 'other@example.com', name: 'Other', $createdAt: '2026-06-30T10:00:00Z', emailVerification: true },
  { $id: '1', email: 'magdy@example.com', name: 'Magdy', $createdAt: '2026-06-29T10:00:00Z', emailVerification: true },
];
const result = filterAndSortUsers(users, normalizeUserQuery({ search: 'magdy', sort: 'joined_asc' }));
assert.deepEqual(result.map(user => user.$id), ['1']);

console.log('✓ admin user query: normalized filters + global search/sort OK');
