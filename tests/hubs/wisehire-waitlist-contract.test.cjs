const assert = require('node:assert/strict');

const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'axios') return { post: async () => ({}) };
  return originalLoad.apply(this, arguments);
};
const wisehire = require('../../appwrite-hubs/wisehire-gateway/src/main.js');
Module._load = originalLoad;

const { consumerEmail, handleWisehireAccess, validEmail } = wisehire._test;

function queryValue(queries, attribute) {
  for (const raw of queries || []) {
    try {
      const query = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (query?.method === 'equal' && query.attribute === attribute) return query.values?.[0];
    } catch (_) {}
  }
  return undefined;
}

function makeDb(initial = [], options = {}) {
  const documents = initial.map((document) => ({ ...document }));
  return {
    documents,
    async listDocuments(_databaseId, collectionId, queries) {
      if (options.listError) throw new Error('database unavailable');
      assert.equal(collectionId, 'wisehire_waitlist');
      const email = queryValue(queries, 'email');
      const filtered = documents.filter((document) => email === undefined || document.email === email);
      return { documents: filtered.slice(0, 1), total: filtered.length };
    },
    async createDocument(_databaseId, collectionId, documentId, data) {
      if (options.createError) throw options.createError;
      assert.equal(collectionId, 'wisehire_waitlist');
      if (documents.some((document) => document.$id === documentId)) {
        throw Object.assign(new Error('duplicate document'), { code: 409 });
      }
      const document = { $id: documentId, ...data };
      documents.push(document);
      return document;
    },
  };
}

function makeUsers(existingEmails = [], error = null) {
  return {
    async list(queries) {
      if (error) throw error;
      const email = queryValue(queries, 'email');
      const found = existingEmails.includes(email);
      return { users: found ? [{ $id: 'user-1', email }] : [], total: found ? 1 : 0 };
    },
  };
}

async function expectStatus(promise, status, messagePattern) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, status);
    assert.match(error.message, messagePattern);
    return true;
  });
}

async function main() {
  assert.equal(validEmail('Recruiter@Example.com'), true);
  assert.equal(validEmail('not-an-email'), false);
  assert.equal(validEmail(`${'a'.repeat(250)}@x.com`), false);
  assert.equal(consumerEmail('person@gmail.com'), true);
  assert.equal(consumerEmail('person@example.com'), false);

  const invalid = await handleWisehireAccess(makeDb(), makeUsers(), null, {
    action: 'waitlist-check-email',
    email: 'invalid',
  });
  assert.deepEqual(invalid, {
    valid_format: false,
    is_consumer_domain: false,
    existing_wiseresume_user: false,
    already_on_waitlist: false,
  });

  const available = await handleWisehireAccess(makeDb(), makeUsers(), null, {
    action: 'waitlist-check-email',
    email: ' Recruiter@Example.com ',
  });
  assert.deepEqual(available, {
    valid_format: true,
    is_consumer_domain: false,
    existing_wiseresume_user: false,
    already_on_waitlist: false,
  });

  const consumerExisting = await handleWisehireAccess(makeDb(), makeUsers(['person@gmail.com']), null, {
    action: 'waitlist-check-email',
    email: 'person@gmail.com',
  });
  assert.deepEqual(consumerExisting, {
    valid_format: true,
    is_consumer_domain: true,
    existing_wiseresume_user: true,
    already_on_waitlist: false,
  });

  const already = await handleWisehireAccess(
    makeDb([{ $id: 'existing', email: 'recruiter@example.com' }]),
    makeUsers(['recruiter@example.com']),
    null,
    { action: 'waitlist-check-email', email: 'recruiter@example.com' },
  );
  assert.equal(already.existing_wiseresume_user, true);
  assert.equal(already.already_on_waitlist, true);

  await assert.rejects(
    handleWisehireAccess(makeDb([], { listError: true }), makeUsers(), null, {
      action: 'waitlist-check-email', email: 'recruiter@example.com',
    }),
    /temporarily unavailable/i,
  );
  await assert.rejects(
    handleWisehireAccess(makeDb(), makeUsers([], new Error('users unavailable')), null, {
      action: 'waitlist-check-email', email: 'recruiter@example.com',
    }),
    /users unavailable/i,
  );

  await expectStatus(
    handleWisehireAccess(makeDb(), makeUsers(), null, { action: 'waitlist-join', email: 'invalid' }),
    400,
    /valid email/i,
  );
  await expectStatus(
    handleWisehireAccess(makeDb(), makeUsers(), null, { action: 'waitlist-join', email: 'person@gmail.com' }),
    400,
    /work email/i,
  );

  const joinDb = makeDb();
  const joined = await handleWisehireAccess(joinDb, makeUsers(['recruiter@example.com']), null, {
    action: 'waitlist-join',
    email: ' Recruiter@Example.com ',
    name: ` ${'N'.repeat(300)} `,
    company_name: ' Example Company ',
    company_size: `${'1'.repeat(100)}`,
  });
  assert.deepEqual(joined, {
    success: true,
    existing_wiseresume_user: true,
    message: 'WiseHire waitlist request received.',
  });
  assert.equal(joinDb.documents.length, 1);
  assert.match(joinDb.documents[0].$id, /^wh_[a-f0-9]{32}$/);
  assert.equal(joinDb.documents[0].email, 'recruiter@example.com');
  assert.equal(joinDb.documents[0].name.length, 256);
  assert.equal(joinDb.documents[0].company_name, 'Example Company');
  assert.equal(joinDb.documents[0].company_size.length, 64);

  const joinedAgain = await handleWisehireAccess(joinDb, makeUsers(), null, {
    action: 'waitlist-join', email: 'recruiter@example.com',
  });
  assert.equal(joinedAgain.already_registered, true);
  assert.equal(joinDb.documents.length, 1);

  const conflictDb = makeDb([], { createError: Object.assign(new Error('concurrent duplicate'), { code: 409 }) });
  const conflictResult = await handleWisehireAccess(conflictDb, makeUsers(), null, {
    action: 'waitlist-join', email: 'race@example.com',
  });
  assert.equal(conflictResult.already_registered, true);

  await assert.rejects(
    handleWisehireAccess(makeDb([], { createError: new Error('write failed') }), makeUsers(), null, {
      action: 'waitlist-join', email: 'recruiter@example.com',
    }),
    /write failed/i,
  );

  console.log('wisehire waitlist contract tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
