const assert = require('node:assert/strict');

const adminHub = require('../../appwrite-hubs/admin-devkit-data/src/main.js');
const { buildWisehireApprovalAction, createWisehireInvite, escapeHtml } = adminHub._test;

async function main() {
  const created = [];
  const databases = {
    async createDocument(databaseId, collectionId, documentId, data) {
      created.push({ databaseId, collectionId, documentId, data });
      return { $id: documentId, ...data };
    },
  };

  const invitation = await createWisehireInvite(databases, ' Recruiter@Example.com ');
  assert.equal(created.length, 1);
  assert.equal(created[0].databaseId, 'main');
  assert.equal(created[0].collectionId, 'wisehire_invites');
  assert.equal(created[0].data.email, 'recruiter@example.com');
  assert.equal(created[0].data.status, 'pending');
  assert.match(created[0].data.token, /^[A-Za-z0-9_-]{32}$/);
  assert.match(invitation.inviteUrl, /\/wisehire\/signup\?invite=/);
  assert.match(invitation.inviteUrl, /email=recruiter%40example\.com/);
  assert.ok(Date.parse(invitation.expiresAt) > Date.now());

  const existing = buildWisehireApprovalAction('recruiter@example.com', 'user-1');
  assert.match(existing.actionUrl, /\/auth\?mode=login/);
  assert.match(existing.actionUrl, /redirect=%2Fwisehire%2Fsignup/);
  assert.doesNotMatch(existing.actionUrl, /\/auth\/sign-in/);

  const fresh = buildWisehireApprovalAction('recruiter@example.com', null, invitation.inviteUrl);
  assert.equal(fresh.actionUrl, invitation.inviteUrl);
  assert.throws(() => buildWisehireApprovalAction('recruiter@example.com', null), /invitation URL/i);
  await assert.rejects(createWisehireInvite(databases, 'not-an-email'), /valid recipient email/i);
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)"> O\'Connor & Co.'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; O&#39;Connor &amp; Co.',
    'waitlist names must be escaped before being interpolated into invitation HTML',
  );

  console.log('wisehire admin invitation tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
