const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'axios') return { post: async () => ({}) };
  return originalLoad.apply(this, arguments);
};
const wisehire = require('../../appwrite-hubs/wisehire-gateway/src/main.js');
Module._load = originalLoad;

const { getMyTalentViews, handleTalentSearch, handleTalentView } = wisehire._test;

function queryValue(queries, attribute) {
  for (const raw of queries || []) {
    try {
      const query = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (query?.method === 'equal' && query.attribute === attribute) return query.values?.[0];
    } catch (_) {}
  }
  return undefined;
}

async function main() {
  let searchQueries = [];
  const searchDb = {
    async listDocuments(_databaseId, collectionId, queries) {
      assert.equal(collectionId, 'talent_pool_profiles');
      searchQueries = queries;
      return {
        documents: [
          { $id: 'visible', user_id: 'candidate-1', full_name: 'Visible Candidate', skills: ['React'], opted_in: true, opted_in_at: '2026-08-17T00:00:00.000Z' },
          { $id: 'hidden', user_id: 'candidate-2', full_name: 'Hidden Candidate', skills: ['React'], opted_in: false, opted_in_at: null },
          { $id: 'inconsistent', user_id: 'candidate-3', full_name: 'Stale Consent', skills: ['React'], opted_in: true, opted_in_at: null },
        ],
        total: 3,
      };
    },
  };
  const search = await handleTalentSearch(searchDb, { availability: 'immediately', limit: 500, offset: -5 });
  assert.equal(queryValue(searchQueries, 'opted_in'), true, 'search must filter consent at the database boundary');
  assert.equal(queryValue(searchQueries, 'availability'), 'immediately');
  assert.deepEqual(search.results.map(result => result.id), ['visible'], 'defensive filtering must drop opted-out or inconsistent records');
  assert.equal(search.total, 1, 'search totals must not disclose hidden or inconsistently consented records');

  const created = [];
  const viewDb = {
    async getDocument(_databaseId, collectionId, documentId) {
      assert.equal(collectionId, 'talent_pool_profiles');
      assert.equal(documentId, 'visible');
      return { $id: 'visible', user_id: 'candidate-1', opted_in: true, opted_in_at: '2026-08-17T00:00:00.000Z' };
    },
    async createDocument(_databaseId, collectionId, _documentId, data, permissions) {
      assert.equal(collectionId, 'talent_pool_views');
      created.push({ data, permissions });
      return { $id: 'view-1', ...data };
    },
  };
  assert.deepEqual(await handleTalentView(viewDb, { $id: 'recruiter-1' }, { profile_id: 'visible' }), { ok: true });
  assert.equal(created[0].data.owner_id, 'recruiter-1');
  const permissionText = JSON.stringify(created[0].permissions);
  assert.match(permissionText, /recruiter-1/);
  assert.match(permissionText, /candidate-1/);

  const hiddenDb = {
    async getDocument() {
      return { $id: 'hidden', user_id: 'candidate-2', opted_in: false, opted_in_at: null };
    },
  };
  await assert.rejects(
    () => handleTalentView(hiddenDb, { $id: 'recruiter-1' }, { profile_id: 'hidden' }),
    error => error.status === 404,
  );

  const historyDb = {
    async listDocuments(_databaseId, collectionId) {
      if (collectionId === 'talent_pool_profiles') {
        return { documents: [{ $id: 'profile-1', user_id: 'candidate-1' }], total: 1 };
      }
      assert.equal(collectionId, 'talent_pool_views');
      return {
        documents: [{ $id: 'view-1', viewed_at: '2026-08-17T01:00:00.000Z', viewer_id: 'private-recruiter-id', owner_id: 'private-recruiter-id' }],
        total: 1,
      };
    },
  };
  assert.deepEqual(
    await getMyTalentViews(historyDb, { $id: 'candidate-1' }),
    { views: [{ id: 'view-1', viewed_at: '2026-08-17T01:00:00.000Z' }] },
    'candidate history must not expose recruiter identity',
  );

  const schema = readFileSync(resolve(__dirname, '../../scripts/setup_wisehire_collections_schema.cjs'), 'utf8');
  assert.match(schema, /'talent_pool_profiles'/);
  assert.match(schema, /'talent_pool_views'/);
  assert.match(schema, /document\.owner_id \|\| document\.user_id \|\| document\.viewer_id/);

  const client = readFileSync(resolve(__dirname, '../../src/hooks/wisehire/useTalentPoolProfile.ts'), 'utf8');
  assert.match(client, /wisehireOwnerPermissions\(userId\)/);
  assert.match(client, /'talent-views-me'/);

  console.log('wisehire talent privacy tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
