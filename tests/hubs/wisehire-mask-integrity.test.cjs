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
                  redactions: [{
                    candidate_id: 'candidate_1',
                    items: [
                      { value: 'Jane Example', category: 'NAME' },
                      { value: 'Cairo, Egypt', category: 'ADDRESS' },
                      { value: 'Not present in source', category: 'NAME' },
                      { value: 'Acme Corporation', category: 'EMPLOYER' },
                    ],
                  }],
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

const { handleMaskCvs, maskSourceText } = wisehire._test;

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
  const deterministic = maskSourceText(
    'Contact jane@example.com, +20 100 123 4567, and https://linkedin.com/in/jane. Worked 2018 - 2024.',
    [],
  );
  assert.doesNotMatch(deterministic.maskedText, /jane@example\.com|\+20 100 123 4567|linkedin\.com/);
  assert.match(deterministic.maskedText, /2018 - 2024/, 'employment dates must not be mistaken for a phone number');
  assert.deepEqual(new Set(deterministic.redactedFields), new Set(['EMAIL', 'PHONE', 'PROFILE LINK']));

  const source = [
    'Jane Example',
    'Cairo, Egypt',
    'jane@example.com | +20 100 123 4567',
    'https://linkedin.com/in/jane',
    'Software Engineer at Acme Corporation from 2018 - 2024.',
    'Delivered JavaScript systems and mentored a team of five engineers.',
  ].join('\n');
  const db = makeDb();
  const result = await handleMaskCvs(db, { $id: 'owner-1' }, {
    candidates: [{ resume_text: source }],
  });

  assert.equal(calls.length, 1);
  const prompt = calls[0].payload.messages[0].content;
  assert.match(prompt, /exact, case-sensitive substrings/i);
  assert.match(prompt, /untrusted source evidence/i);
  assert.match(prompt, /do not mark employer names/i);

  assert.equal(result.results.length, 1);
  const masked = result.results[0];
  assert.equal(masked.label, 'Candidate 1');
  assert.equal(masked.filename, 'candidate_1_review-draft.pdf');
  assert.equal(masked.reviewRequired, true);
  assert.doesNotMatch(masked.maskedText, /Jane Example|Cairo, Egypt|jane@example\.com|linkedin\.com|\+20 100/);
  assert.match(masked.maskedText, /Acme Corporation/);
  assert.match(masked.maskedText, /2018 - 2024/);
  assert.doesNotMatch(masked.maskedText, /Not present in source/);

  assert.equal(db.created.length, 1);
  assert.equal(db.created[0].collectionId, 'wisehire_mask_sessions');
  assert.ok(Array.isArray(db.created[0].permissions) && db.created[0].permissions.length === 3);
  assert.doesNotMatch(db.created[0].data.results, /Jane Example|jane@example\.com|\+20 100/);

  await assert.rejects(
    handleMaskCvs(makeDb(), { $id: 'owner-1' }, { candidates: [] }),
    (error) => error.status === 400 && /between 1 and 10/i.test(error.message),
  );
  await assert.rejects(
    handleMaskCvs(makeDb(), { $id: 'owner-1' }, { candidates: [{ resume_text: 'too short' }] }),
    (error) => error.status === 400 && /readable text/i.test(error.message),
  );

  console.log('wisehire masking integrity tests passed');
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
