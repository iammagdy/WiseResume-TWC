const assert = require('node:assert/strict');

const originalEnvironment = {
  OPENROUTER_KEY_1: process.env.OPENROUTER_KEY_1,
  GROQ_KEY_1: process.env.GROQ_KEY_1,
  DEEPSEEK_KEY: process.env.DEEPSEEK_KEY,
  NVIDIA_KEY_1: process.env.NVIDIA_KEY_1,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
};
process.env.OPENROUTER_KEY_1 = 'test-ai-key';
process.env.RESEND_API_KEY = 'test-resend-key';
delete process.env.GROQ_KEY_1;
delete process.env.DEEPSEEK_KEY;
delete process.env.NVIDIA_KEY_1;

const calls = [];
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'axios') {
    return {
      post: async (url, payload, options) => {
        calls.push({ url, payload, options });
        if (url.includes('resend.com')) return { data: { id: 'resend-message-1' } };
        return {
          data: {
            choices: [{ message: { content: JSON.stringify({ draft: 'Hello Jane,\n\nWould you be open to discussing the Engineer role?' }) } }],
          },
        };
      },
    };
  }
  return originalLoad.apply(this, arguments);
};
const wisehire = require('../../appwrite-hubs/wisehire-gateway/src/main.js');
Module._load = originalLoad;

const { handleOutreach } = wisehire._test;

function makeDb() {
  const created = [];
  const documents = {
    wisehire_candidates: {
      'candidate-1': {
        $id: 'candidate-1',
        owner_id: 'owner-1',
        role_id: 'role-1',
        name: 'Jane Example',
        email: 'jane@example.com',
        resume_text: 'Delivered JavaScript systems and mentored engineers.',
      },
    },
    wisehire_roles: {
      'role-1': {
        $id: 'role-1',
        owner_id: 'owner-1',
        title: 'Engineer',
        description: 'Build JavaScript systems and collaborate with the team.',
      },
    },
  };
  return {
    created,
    async getDocument(_databaseId, collectionId, documentId) {
      const document = documents[collectionId]?.[documentId];
      if (!document) throw Object.assign(new Error('not found'), { code: 404 });
      return document;
    },
    async createDocument(databaseId, collectionId, documentId, data, permissions) {
      created.push({ databaseId, collectionId, documentId, data, permissions });
      return { $id: documentId, ...data };
    },
  };
}

const access = { userId: 'owner-1', ownerId: 'owner-1', companyId: 'company-1', role: 'owner' };

async function main() {
  const db = makeDb();
  const draft = await handleOutreach(db, { $id: 'owner-1' }, {
    candidate_id: 'candidate-1',
    ai_draft: true,
    __wisehireAccess: access,
  });
  assert.match(draft.draft, /Engineer role/);
  assert.equal(calls.length, 1, 'AI draft must call the configured provider');
  assert.match(calls[0].payload.messages[0].content, /untrusted evidence/i);
  assert.match(calls[0].payload.messages[0].content, /do not mention or infer protected traits/i);
  assert.match(calls[0].payload.messages[0].content, /do not.*claim the candidate is a strong fit/i);

  const sent = await handleOutreach(db, { $id: 'owner-1' }, {
    candidate_id: 'candidate-1',
    to_email: ' Jane@Example.com ',
    subject: 'Engineer opportunity',
    body: 'Would you be open to a conversation?',
    __wisehireAccess: access,
  });
  assert.equal(sent.status, 'sent');
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /api\.resend\.com\/emails/);
  assert.equal(calls[1].payload.to[0], 'jane@example.com');
  assert.equal(calls[1].payload.text, 'Would you be open to a conversation?');
  assert.equal(db.created[0].collectionId, 'wisehire_outreach_emails');
  assert.equal(db.created[0].data.owner_id, 'owner-1');
  assert.equal(db.created[0].data.status, 'sent');
  assert.equal(db.created[0].data.resend_message_id, 'resend-message-1');
  assert.ok(Array.isArray(db.created[0].permissions) && db.created[0].permissions.length === 3);

  await assert.rejects(
    handleOutreach(makeDb(), { $id: 'owner-1' }, {
      candidate_id: 'candidate-1',
      to_email: 'other@example.com',
      subject: 'Subject',
      body: 'Body',
      __wisehireAccess: access,
    }),
    (error) => error.status === 400 && /match the email/i.test(error.message),
  );

  delete process.env.RESEND_API_KEY;
  const savedDb = makeDb();
  const saved = await handleOutreach(savedDb, { $id: 'owner-1' }, {
    candidate_id: 'candidate-1',
    to_email: 'jane@example.com',
    subject: 'Engineer opportunity',
    body: 'Saved draft body',
    __wisehireAccess: access,
  });
  assert.equal(saved.status, 'saved');
  assert.equal(savedDb.created[0].data.resend_message_id, null);

  console.log('wisehire outreach integrity tests passed');
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
