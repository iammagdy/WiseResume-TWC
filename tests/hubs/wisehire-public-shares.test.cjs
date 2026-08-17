const assert = require('node:assert/strict');

const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'axios') return { post: async () => ({}) };
  return originalLoad.apply(this, arguments);
};
const wisehire = require('../../appwrite-hubs/wisehire-gateway/src/main.js');
Module._load = originalLoad;

const { getPublicCandidateBrief, getPublicScorecard } = wisehire._test;

function queryValue(queries, attribute) {
  for (const raw of queries || []) {
    try {
      const query = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (query?.method === 'equal' && query.attribute === attribute) return query.values?.[0];
    } catch (_) {}
  }
  return undefined;
}

function makeDb(collections) {
  return {
    async listDocuments(_databaseId, collectionId, queries) {
      const docs = collections[collectionId] || [];
      const token = queryValue(queries, 'share_token');
      const active = queryValue(queries, 'share_token_active');
      const filtered = docs.filter((doc) => (
        (token === undefined || doc.share_token === token)
        && (active === undefined || doc.share_token_active === active)
      ));
      return { documents: filtered.slice(0, 1), total: filtered.length };
    },
    async getDocument(_databaseId, collectionId, documentId) {
      const doc = (collections[collectionId] || []).find((candidate) => candidate.$id === documentId);
      if (!doc) throw Object.assign(new Error('not found'), { code: 404 });
      return doc;
    },
  };
}

async function main() {
  const db = makeDb({
    wisehire_candidate_briefs: [{
      $id: 'brief-1',
      $createdAt: '2026-08-17T00:00:00.000Z',
      owner_id: 'owner-1',
      candidate_id: 'candidate-1',
      role_id: 'role-1',
      match_score: 76,
      strengths: ['Relevant evidence'],
      concerns: ['Verify dates'],
      interview_questions: ['Describe the evidence.'],
      employment_notes: 'Recruiter-authored review note.',
      share_token: 'brief-share-token-1234567890',
      share_token_active: true,
      ai_model_used: 'private-provider-name',
    }],
    wisehire_candidates: [{
      $id: 'candidate-1',
      owner_id: 'owner-1',
      name: 'Candidate Name',
      email: 'candidate@example.com',
      phone: '+1 555 0100',
      resume_text: 'private resume text',
    }],
    wisehire_roles: [{ $id: 'role-1', owner_id: 'owner-1', title: 'Engineer', private_notes: 'secret' }],
    wisehire_scorecards: [{
      $id: 'scorecard-1',
      owner_id: 'owner-1',
      candidate_id: 'candidate-1',
      brief_id: 'brief-1',
      questions: ['Technical evidence?'],
      ratings: [4],
      notes: ['Observed answer'],
      overall_score: 4,
      submitted_at: '2026-08-17T01:00:00.000Z',
      share_token: 'score-share-token-1234567890',
      share_token_active: true,
      internal_metadata: 'secret',
    }],
  });

  const briefResult = await getPublicCandidateBrief(db, { share_token: 'brief-share-token-1234567890' });
  assert.equal(briefResult.brief.candidate.name, 'Candidate Name');
  assert.equal(briefResult.brief.role.title, 'Engineer');
  assert.equal(briefResult.brief.match_score, 76);
  const briefJson = JSON.stringify(briefResult);
  for (const secret of ['candidate@example.com', '+1 555 0100', 'private resume text', 'private-provider-name', 'owner-1', 'brief-share-token']) {
    assert.doesNotMatch(briefJson, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const scoreResult = await getPublicScorecard(db, { share_token: 'score-share-token-1234567890' });
  assert.deepEqual(scoreResult.scorecard.questions, ['Technical evidence?']);
  assert.deepEqual(scoreResult.scorecard.ratings, [4]);
  assert.deepEqual(scoreResult.scorecard.notes, ['Observed answer']);
  const scoreJson = JSON.stringify(scoreResult);
  for (const privateValue of ['owner-1', 'candidate-1', 'brief-1', 'score-share-token', 'internal_metadata']) {
    assert.doesNotMatch(scoreJson, new RegExp(privateValue));
  }

  assert.deepEqual(await getPublicCandidateBrief(db, { share_token: 'short' }), { brief: null });
  assert.deepEqual(await getPublicScorecard(db, { share_token: 'missing-share-token-123456' }), { scorecard: null });

  const draftDb = makeDb({
    wisehire_scorecards: [{
      $id: 'draft-1',
      questions: ['Private draft'],
      ratings: [null],
      notes: ['Not submitted'],
      submitted_at: null,
      share_token: 'draft-share-token-1234567890',
      share_token_active: true,
    }],
  });
  assert.deepEqual(
    await getPublicScorecard(draftDb, { share_token: 'draft-share-token-1234567890' }),
    { scorecard: null },
    'draft scorecards must never be exposed by the public endpoint',
  );

  const missingRatingsDb = makeDb({
    wisehire_scorecards: [{
      $id: 'submitted-no-ratings',
      questions: ['Question without a rating'],
      ratings: [null],
      notes: [''],
      overall_score: null,
      submitted_at: '2026-08-17T01:00:00.000Z',
      share_token: 'missing-rating-token-1234567890',
      share_token_active: true,
    }],
  });
  const missingRatings = await getPublicScorecard(missingRatingsDb, { share_token: 'missing-rating-token-1234567890' });
  assert.deepEqual(missingRatings.scorecard.ratings, [null]);
  assert.equal(missingRatings.scorecard.overall_score, null);

  console.log('wisehire public share tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
