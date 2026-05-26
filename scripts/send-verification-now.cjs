/**
 * One-off: send verification email to a user by email address.
 * Usage: node scripts/send-verification-now.cjs magdy.saber+5@outlook.com
 * Requires .env.deploy with APPWRITE_API_KEY and RESEND_API_KEY.
 */
const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');

function loadEnv(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

loadEnv('.env.deploy');

const targetEmail = (process.argv[2] || '').trim().toLowerCase();
if (!targetEmail) {
  console.error('Usage: node scripts/send-verification-now.cjs <email>');
  process.exit(1);
}

const ENDPOINT = (process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://resume.thewise.cloud').replace(/\/$/, '');
const apiKey = process.env.APPWRITE_API_KEY;
const resendKey = process.env.RESEND_API_KEY;

if (!apiKey || !resendKey) {
  console.error('Missing APPWRITE_API_KEY or RESEND_API_KEY in .env.deploy');
  process.exit(1);
}

async function main() {
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);
  const users = new sdk.Users(client);

  const list = await users.list([sdk.Query.equal('email', [targetEmail]), sdk.Query.limit(1)]);
  const user = list.users[0];
  if (!user) {
    console.error(`No Appwrite user found for ${targetEmail}`);
    process.exit(1);
  }

  if (user.emailVerification) {
    console.log(`User ${user.$id} is already email-verified.`);
    process.exit(0);
  }

  const redirectUrl = `${FRONTEND_URL}/auth/verify-email`;
  const tokenRes = await fetch(`${ENDPOINT}/users/${encodeURIComponent(user.$id)}/verification`, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: redirectUrl }),
  });
  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.secret) {
    console.error('Token creation failed:', token);
    process.exit(1);
  }

  const verifyUrl = `${redirectUrl}?userId=${encodeURIComponent(user.$id)}&secret=${encodeURIComponent(token.secret)}`;
  const html = `<p>Verify your WiseResume account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${process.env.RESEND_FROM_NAME || 'WiseResume'} <${process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud'}>`,
      to: [targetEmail],
      subject: 'Verify your WiseResume email address',
      html,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error('Resend failed:', body);
    process.exit(1);
  }

  console.log(`Sent verification to ${targetEmail} (Resend id: ${body.id || 'ok'})`);
  console.log(`Link: ${verifyUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
