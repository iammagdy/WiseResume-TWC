const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.PUBLIC_SHARE_TOKEN_SECRET = 'public-share-test-secret-at-least-32-bytes-long';
process.env.APPWRITE_PROJECT_ID = 'test-project';
process.env.APPWRITE_API_KEY = 'test-key';

const publicShare = require('../../appwrite-hubs/public-share/src/main.js');
const test = publicShare.__test;

function queryValue(queries, attribute) {
  for (const raw of queries || []) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed?.method === 'equal' && parsed.attribute === attribute) return parsed.values?.[0];
    } catch (_) {}
  }
  return undefined;
}

function missing() {
  const error = new Error('Document could not be found');
  error.code = 404;
  return error;
}

function makeDb({ share, resume, comments = [] }) {
  const rates = new Map();
  let resumeReads = 0;
  let commentReads = 0;
  const state = {
    share: { ...share },
    resume: { ...resume },
    comments: comments.map((comment) => ({ ...comment })),
  };

  return {
    state,
    get resumeReads() { return resumeReads; },
    get commentReads() { return commentReads; },
    async listDocuments(_database, collection, queries) {
      if (collection === 'resume_shares') {
        const hash = queryValue(queries, 'token_hash');
        const legacy = queryValue(queries, 'token');
        const found = hash === state.share.token_hash || legacy === state.share.token;
        return { documents: found ? [{ ...state.share }] : [] };
      }
      if (collection === 'share_comments') {
        commentReads += 1;
        const shareId = queryValue(queries, 'share_id');
        const unresolved = queryValue(queries, 'is_resolved');
        return {
          documents: state.comments.filter((comment) =>
            comment.share_id === shareId && (unresolved === undefined || comment.is_resolved === unresolved)),
        };
      }
      return { documents: [] };
    },
    async getDocument(_database, collection, id) {
      if (collection === 'resume_share_rate_limits') {
        if (!rates.has(id)) throw missing();
        return { ...rates.get(id) };
      }
      if (collection === 'resumes') {
        resumeReads += 1;
        if (id !== state.resume.$id) throw missing();
        return { ...state.resume };
      }
      if (collection === 'resume_shares') {
        if (id !== state.share.$id) throw missing();
        return { ...state.share };
      }
      throw missing();
    },
    async createDocument(_database, collection, id, data) {
      if (collection === 'resume_share_rate_limits') {
        if (rates.has(id)) {
          const conflict = new Error('already exists');
          conflict.code = 409;
          throw conflict;
        }
        const doc = { $id: id, ...data };
        rates.set(id, doc);
        return { ...doc };
      }
      if (collection === 'share_comments') {
        const doc = { $id: id, $createdAt: new Date().toISOString(), ...data };
        state.comments.push(doc);
        return { ...doc };
      }
      throw new Error(`Unexpected create in ${collection}`);
    },
    async updateDocument(_database, collection, id, data) {
      if (collection === 'resume_share_rate_limits') {
        const next = { ...rates.get(id), ...data };
        rates.set(id, next);
        return { ...next };
      }
      if (collection === 'resume_shares' && id === state.share.$id) {
        Object.assign(state.share, data);
        return { ...state.share };
      }
      throw new Error(`Unexpected update in ${collection}`);
    },
    async incrementDocumentAttribute(_database, collection, id, key, amount, max) {
      if (collection === 'resume_share_rate_limits') {
        const doc = rates.get(id);
        const next = Number(doc[key] || 0) + amount;
        if (max !== undefined && next > max) {
          const error = new Error('maximum value exceeded');
          error.code = 400;
          throw error;
        }
        doc[key] = next;
        return { ...doc };
      }
      if (collection === 'resume_shares' && id === state.share.$id) {
        state.share[key] = Number(state.share[key] || 0) + amount;
        return { ...state.share };
      }
      throw new Error(`Unexpected increment in ${collection}`);
    },
  };
}

function responseCapture() {
  const capture = { status: null, body: null };
  return {
    capture,
    res: {
      json(body, status = 200) {
        capture.body = body;
        capture.status = status;
        return capture;
      },
    },
  };
}

(async () => {
  const token = test.generateShareToken();
  assert.equal(token.length, 43, 'new bearer tokens must contain 256 bits encoded as base64url');
  assert.equal(test.isPlausibleShareToken(token), true);
  assert.equal(test.isPlausibleShareToken('too-short'), false);
  assert.equal(test.shareIsActive({ is_active: true, expires_at: new Date(Date.now() - 1_000).toISOString() }), false);
  assert.equal(test.shareIsActive({ is_active: false, expires_at: null }), false);

  const passwordHash = test.hashSharePassword('correct horse battery staple');
  assert.match(passwordHash, /^scrypt\$v=1\$/);
  assert.equal(test.verifySharePassword('correct horse battery staple', passwordHash), true);
  assert.equal(test.verifySharePassword('wrong password', passwordHash), false);

  const storedShare = test.buildNewShareDocument({
    userId: 'owner-1',
    resumeId: 'resume-1',
    token,
    password: 'correct horse battery staple',
    expiresAt: null,
  });
  assert.equal(storedShare.token, test.shareTokenStorageMarker(test.hashShareToken(token)));
  assert.equal(storedShare.token_hash, test.hashShareToken(token));
  assert.notEqual(storedShare.token, token, 'the bearer credential must never be persisted');
  assert.equal(storedShare.password, null);
  assert.notEqual(storedShare.password_hash, 'correct horse battery staple');
  assert.equal(test.verifySharePassword('correct horse battery staple', storedShare.password_hash), true);

  const tokenHash = test.hashShareToken(token);
  const db = makeDb({
    share: {
      $id: 'share-1',
      $createdAt: '2026-08-17T00:00:00.000Z',
      user_id: 'owner-1',
      resume_id: 'resume-1',
      token: tokenHash,
      token_hash: tokenHash,
      is_active: true,
      has_password: true,
      password: null,
      password_hash: passwordHash,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      view_count: 0,
    },
    resume: {
      $id: 'resume-1',
      $permissions: ['read("any")'],
      user_id: 'owner-1',
      title: 'Security Engineer',
      summary: 'Builds secure systems.',
      contact_info: JSON.stringify({ fullName: 'Test Candidate', email: 'candidate@example.com' }),
      experience: JSON.stringify([{ id: 'exp-1', company: 'Example' }]),
      skills: JSON.stringify(['Security']),
      target_job_description: 'must not leak',
    },
    comments: [{
      $id: 'comment-1',
      $createdAt: '2026-08-17T00:00:00.000Z',
      share_id: 'share-1',
      author_name: 'Reviewer',
      section: 'summary',
      content: 'Clear and concise.',
      is_resolved: false,
    }],
  });
  const req = { headers: { 'x-real-ip': '203.0.113.10' } };

  const gated = responseCapture();
  await test.handleGetResumeShare(db, { token }, req, gated.res);
  assert.equal(gated.capture.status, 200);
  assert.deepEqual(gated.capture.body.data, { requires_password: true, authenticated: false });
  assert.equal(db.resumeReads, 0, 'resume content must not be read before password authorization');

  const wrong = responseCapture();
  await test.handleGetResumeShare(db, { token, password: 'wrong password' }, req, wrong.res);
  assert.equal(wrong.capture.body.data.password_incorrect, true);
  assert.equal(db.resumeReads, 0, 'wrong passwords must not trigger a resume read');

  const unlocked = responseCapture();
  await test.handleGetResumeShare(db, { token, password: 'correct horse battery staple' }, req, unlocked.res);
  assert.equal(unlocked.capture.status, 200);
  assert.equal(db.resumeReads, 1);
  assert.equal(typeof unlocked.capture.body.data.access_token, 'string');
  assert.deepEqual(unlocked.capture.body.data.resume.contact_info, {
    fullName: 'Test Candidate',
    email: 'candidate@example.com',
  });
  assert.deepEqual(unlocked.capture.body.data.resume.experience, [{ id: 'exp-1', company: 'Example' }]);
  assert.equal('user_id' in unlocked.capture.body.data.resume, false);
  assert.equal('target_job_description' in unlocked.capture.body.data.resume, false);
  assert.equal('$permissions' in unlocked.capture.body.data.resume, false);
  assert.equal(db.state.share.password, null, 'legacy password material must be cleared during upgrade');
  assert.match(db.state.share.password_hash, /^scrypt\$v=1\$/);
  assert.equal(
    test.validateShareAccessToken(
      unlocked.capture.body.data.access_token,
      db.state.share,
      tokenHash,
    ),
    true,
  );
  assert.equal(
    test.validateShareAccessToken(
      unlocked.capture.body.data.access_token,
      { ...db.state.share, access_version: 2 },
      tokenHash,
    ),
    false,
    'password/token changes must invalidate previously issued capabilities',
  );
  assert.equal(
    test.validateShareAccessToken(
      unlocked.capture.body.data.access_token,
      { ...db.state.share, is_active: false },
      tokenHash,
    ),
    false,
    'revocation must invalidate capabilities immediately',
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rejected = responseCapture();
    await test.handleGetResumeShare(db, { token, password: 'still wrong' }, req, rejected.res);
    assert.equal(rejected.capture.body.data.password_incorrect, true);
  }
  const throttled = responseCapture();
  await test.handleGetResumeShare(db, { token, password: 'still wrong' }, req, throttled.res);
  assert.equal(throttled.capture.status, 429, 'password guessing must be persistently throttled');
  assert.equal(throttled.capture.body.code, 'rate_limited');

  const deniedComments = responseCapture();
  await test.handleGetPublicShareComments(db, { token }, req, deniedComments.res);
  assert.equal(deniedComments.capture.status, 403);
  assert.equal(db.commentReads, 0, 'protected feedback must not bypass the share capability');

  const comments = responseCapture();
  await test.handleGetPublicShareComments(db, {
    token,
    accessToken: unlocked.capture.body.data.access_token,
  }, req, comments.res);
  assert.equal(comments.capture.status, 200);
  assert.equal(comments.capture.body.data.length, 1);
  assert.equal(comments.capture.body.data[0].content, 'Clear and concise.');

  const sanitized = test.sanitizePublicResume({
    user_id: 'private',
    title: 'Resume',
    contact_info: '{"fullName":"A"}',
    experience: 'not-json',
  });
  assert.deepEqual(sanitized.contact_info, { fullName: 'A' });
  assert.deepEqual(sanitized.experience, []);
  assert.equal('user_id' in sanitized, false);

  const lookupCalls = [];
  const noMatchDb = {
    async listDocuments(_database, _collection, queries) {
      lookupCalls.push(queries);
      return { documents: [] };
    },
  };
  await test.findShareByToken(noMatchDb, 'a'.repeat(64));
  assert.equal(lookupCalls.length, 1, 'modern/hash-shaped values must never fall back to the raw-token column');
  await test.findShareByToken(noMatchDb, 'abcdef0123456789');
  assert.equal(lookupCalls.length, 3, 'legacy 16-hex links retain a one-time migration lookup');

  const schemaSource = fs.readFileSync(path.join(__dirname, '../../scripts/setup_resume_share_security_schema.cjs'), 'utf8');
  assert.match(schemaSource, /resume_shares:[\s\S]*permissions:\s*\[\]/);
  assert.match(schemaSource, /share_comments:[\s\S]*permissions:\s*\[\]/);
  assert.match(schemaSource, /resume_share_rate_limits:[\s\S]*permissions:\s*\[\]/);
  assert.match(schemaSource, /updateCollection\(DB_ID, 'resumes'[\s\S]*permissions, true/);
  assert.match(schemaSource, /updateDocument\(DB_ID, 'resumes'[\s\S]*wanted/);
  assert.match(schemaSource, /updateDocument\(DB_ID, 'resume_shares', share\.\$id, payload, \[\]\)/);
  assert.match(schemaSource, /updateDocument\(DB_ID, 'share_comments', comment\.\$id, \{\}, \[\]\)/);

  const publicHook = fs.readFileSync(path.join(__dirname, '../../src/hooks/useResumeShares.ts'), 'utf8');
  const commentsHook = fs.readFileSync(path.join(__dirname, '../../src/hooks/useShareComments.ts'), 'utf8');
  assert.doesNotMatch(publicHook, /databases\.(?:get|list|create|update|delete)Document/);
  assert.doesNotMatch(commentsHook, /databases\.(?:get|list|create|update|delete)Document/);
  assert.match(publicHook, /invoke<PublicResumeResult>\('get-resume-share'/);
  assert.match(commentsHook, /'get-public-share-comments'/);
  assert.match(commentsHook, /'add-public-share-comment'/);

  console.log('public share security tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
