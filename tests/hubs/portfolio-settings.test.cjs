'use strict';
// Unit tests for the portfolio-settings hub core logic (processRequest), using
// an injected in-memory db + injected user resolver so node-appwrite is not hit.
const assert = require('assert');
const handler = require('../../appwrite-hubs/portfolio-settings/src/main.js');
const { processRequest, extractJwt } = handler.__test;

function makeDb(initial = []) {
  return {
    docs: initial.map((d) => ({ ...d })),
    async listDocuments() { return { documents: this.docs.map((d) => ({ ...d })), total: this.docs.length }; },
    async createDocument(_db, _c, id, data) { const doc = { $id: String(id), ...data }; this.docs.push(doc); return doc; },
    async updateDocument(_db, _c, id, data) { const d = this.docs.find((x) => x.$id === id); if (d) Object.assign(d, data); return d; },
  };
}
const req = { headers: {} };
const uid = (id) => async () => id;
const noHash = (body) =>
  assert.ok(!('password_hash' in body) && !('passwordHash' in body), 'response must NOT include a hash: ' + JSON.stringify(body));

(async () => {
  // extractJwt reads the embedded __headers (how the browser wrapper sends it)
  assert.strictEqual(extractJwt({ __headers: { 'X-Appwrite-JWT': 'tok' } }, { headers: {} }), 'tok');
  assert.strictEqual(extractJwt({ __headers: { Authorization: 'Bearer abc' } }, { headers: {} }), 'abc');

  // 1. Unauthorized request denied
  {
    const db = makeDb();
    const r = await processRequest({ body: { action: 'status' }, req, resolveUserId: async () => null, db });
    assert.strictEqual(r.httpStatus, 401, 'unauth -> 401');
    noHash(r.body);
    assert.strictEqual(db.docs.length, 0, 'no write on unauth');
  }

  // 2. Owner can enable with a new password (server-side bcrypt, no hash returned)
  {
    const db = makeDb();
    const r = await processRequest({ body: { action: 'enable', password: 'supersecret1' }, req, resolveUserId: uid('u1'), db });
    assert.strictEqual(r.httpStatus, 200);
    assert.strictEqual(r.body.passwordEnabled, true);
    noHash(r.body);
    assert.strictEqual(db.docs.length, 1, 'settings doc created');
    assert.strictEqual(db.docs[0].user_id, 'u1');
    assert.strictEqual(db.docs[0].password_enabled, true);
    assert.ok(/^\$2[aby]\$/.test(db.docs[0].password_hash), 'bcrypt hash stored server-side');
  }

  // 3. Weak password rejected, nothing written
  {
    const db = makeDb();
    const r = await processRequest({ body: { action: 'enable', password: 'short' }, req, resolveUserId: uid('u1'), db });
    assert.strictEqual(r.httpStatus, 400);
    assert.strictEqual(r.body.code, 'weak_password');
    assert.strictEqual(db.docs.length, 0);
  }

  // 4. Enable without a password and no existing hash -> error
  {
    const db = makeDb([{ $id: 'd1', user_id: 'u1', password_enabled: false }]);
    const r = await processRequest({ body: { action: 'enable' }, req, resolveUserId: uid('u1'), db });
    assert.strictEqual(r.httpStatus, 400);
    assert.strictEqual(r.body.code, 'no_password');
  }

  // 5. Re-enable (toggle on) reusing an existing stored hash
  {
    const db = makeDb([{ $id: 'd1', user_id: 'u1', password_enabled: false, password_hash: '$2b$12$abcdefghijklmnopqrstuv' }]);
    const r = await processRequest({ body: { action: 'enable' }, req, resolveUserId: uid('u1'), db });
    assert.strictEqual(r.httpStatus, 200);
    assert.strictEqual(r.body.passwordEnabled, true);
    noHash(r.body);
    assert.strictEqual(db.docs[0].password_enabled, true);
    assert.ok(db.docs[0].password_hash.startsWith('$2b$'), 'existing hash preserved');
  }

  // 6. Owner can disable (hash cleared, no hash returned)
  {
    const db = makeDb([{ $id: 'd1', user_id: 'u1', password_enabled: true, password_hash: '$2b$12$abc' }]);
    const r = await processRequest({ body: { action: 'disable' }, req, resolveUserId: uid('u1'), db });
    assert.strictEqual(r.httpStatus, 200);
    assert.strictEqual(r.body.passwordEnabled, false);
    noHash(r.body);
    assert.strictEqual(db.docs[0].password_enabled, false);
    assert.strictEqual(db.docs[0].password_hash, null, 'hash cleared to null on disable');
  }

  // 7. status reports state without the hash
  {
    const db = makeDb([{ $id: 'd1', user_id: 'u1', password_enabled: true, password_hash: '$2b$12$abc' }]);
    const r = await processRequest({ body: { action: 'status' }, req, resolveUserId: uid('u1'), db });
    assert.strictEqual(r.httpStatus, 200);
    assert.strictEqual(r.body.passwordEnabled, true);
    assert.strictEqual(r.body.hasPassword, true);
    noHash(r.body);
  }

  // 8. Browser-supplied user_id is NEVER trusted (uses the authenticated id)
  {
    const db = makeDb();
    await processRequest({ body: { action: 'enable', password: 'supersecret1', user_id: 'attacker' }, req, resolveUserId: uid('realuser'), db });
    assert.strictEqual(db.docs[0].user_id, 'realuser', 'must use authenticated user_id, not body.user_id');
  }

  console.log('[TEST] portfolio-settings: all assertions passed');
})().catch((e) => { console.error('[TEST] portfolio-settings FAILED:', e && e.message); process.exit(1); });
