const assert = require('node:assert/strict');

const originalEnvironment = {
  OPENROUTER_KEY_1: process.env.OPENROUTER_KEY_1,
  GROQ_KEY_1: process.env.GROQ_KEY_1,
  DEEPSEEK_KEY: process.env.DEEPSEEK_KEY,
  NVIDIA_KEY_1: process.env.NVIDIA_KEY_1,
};
process.env.OPENROUTER_KEY_1 = 'test-key';
delete process.env.GROQ_KEY_1;
delete process.env.DEEPSEEK_KEY;
delete process.env.NVIDIA_KEY_1;

const calls = [];
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'axios') {
    return {
      post: async (url, payload) => {
        calls.push({ url, payload });
        return {
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  results: [
                    {
                      candidate_id: 'candidate_2',
                      evidence_alignment: null,
                      supported_evidence: ['Explicit evidence for candidate two'],
                      questions_to_verify: ['Verify an unstated detail'],
                      summary: 'Candidate two summary',
                    },
                    {
                      candidate_id: 'candidate_1',
                      evidence_alignment: 140,
                      supported_evidence: ['Explicit evidence for candidate one'],
                      questions_to_verify: [],
                      summary: 'Candidate one summary',
                    },
                    {
                      candidate_id: 'model_only_candidate',
                      evidence_alignment: 99,
                      supported_evidence: ['Must be dropped'],
                      questions_to_verify: [],
                      summary: 'Must be dropped',
                    },
                  ],
                }),
              },
            }],
          },
        };
      },
    };
  }
  return originalLoad.apply(this, arguments);
};
const wisehire = require('../../appwrite-hubs/wisehire-gateway/src/main.js');
Module._load = originalLoad;

const { clampedNumber, handleBulkScreen } = wisehire._test;

function makeDb() {
  const created = [];
  return {
    created,
    async createDocument(databaseId, collectionId, documentId, data, permissions) {
      created.push({ databaseId, collectionId, documentId, data, permissions });
      return { $id: documentId, ...data };
    },
  };
}

async function main() {
  assert.equal(clampedNumber(null, 0, 100), null);
  assert.equal(clampedNumber('', 0, 100), null);
  assert.equal(clampedNumber(false, 0, 100), null);
  assert.equal(clampedNumber('101', 0, 100, true), 100);

  const db = makeDb();
  const result = await handleBulkScreen(db, { $id: 'owner-1' }, {
    jd_text: 'A role requiring explicit JavaScript delivery evidence and collaboration.',
    candidates: [
      { filename_name: 'first.pdf', resume_text: `First candidate evidence ${'A'.repeat(100)}` },
      { filename_name: 'second.pdf', resume_text: `Second candidate evidence ${'B'.repeat(100)}` },
    ],
  });

  assert.equal(calls.length, 1, 'bulk review must use the configured AI provider rather than a fake keyword score');
  const systemPrompt = calls[0].payload.messages[0].content;
  assert.match(systemPrompt, /untrusted source evidence/i);
  assert.match(systemPrompt, /protected trait/i);
  assert.match(systemPrompt, /not hiring decisions/i);
  assert.match(systemPrompt, /not candidate suitability/i);

  assert.equal(result.results.length, 2, 'model-only records must be dropped');
  assert.deepEqual(result.results.map((candidate) => candidate.filename_name), ['first.pdf', 'second.pdf']);
  assert.deepEqual(result.results.map((candidate) => candidate.rank), [1, 2], 'upload order must stay authoritative');
  assert.equal(result.results[0].match_score, 100, 'numeric estimates must be clamped');
  assert.equal(result.results[1].match_score, null, 'missing estimates must not silently become zero');
  assert.deepEqual(result.results[1].strengths, ['Explicit evidence for candidate two']);

  assert.equal(db.created.length, 1);
  assert.equal(db.created[0].collectionId, 'wisehire_bulk_screen_jobs');
  assert.ok(Array.isArray(db.created[0].permissions) && db.created[0].permissions.length === 3);
  assert.doesNotMatch(db.created[0].data.results, /First candidate evidence|Second candidate evidence/);
  assert.doesNotMatch(db.created[0].data.results, /model_only_candidate/);

  await assert.rejects(
    handleBulkScreen(makeDb(), { $id: 'owner-1' }, { jd_text: 'too short', candidates: [{}] }),
    (error) => error.status === 400 && /job description/i.test(error.message),
  );
  await assert.rejects(
    handleBulkScreen(makeDb(), { $id: 'owner-1' }, {
      jd_text: 'A sufficiently detailed role description for review.',
      candidates: [{ filename_name: 'empty.pdf', resume_text: 'too short' }],
    }),
    (error) => error.status === 400 && /readable text/i.test(error.message),
  );
  await assert.rejects(
    handleBulkScreen(makeDb(), { $id: 'owner-1' }, {
      jd_text: 'A sufficiently detailed role description for review.',
      candidates: Array.from({ length: 11 }, (_, index) => ({
        filename_name: `${index}.pdf`,
        resume_text: 'Readable resume evidence '.repeat(10),
      })),
    }),
    (error) => error.status === 400 && /between 1 and 10/i.test(error.message),
  );

  console.log('wisehire bulk review integrity tests passed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
