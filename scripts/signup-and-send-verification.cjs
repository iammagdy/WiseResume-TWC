/**
 * Create account (if missing) and send verification email via admin token + Resend.
 * Usage: node scripts/signup-and-send-verification.cjs magdy.saber+8@outlook.com "P@ssw0rd" "Magdy Test"
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
loadEnv('.env');

const email = (process.argv[2] || '').trim().toLowerCase();
const password = process.argv[3] || 'P@ssw0rd';
const name = process.argv[4] || 'Magdy Saber Test';

if (!email) {
  console.error('Usage: node scripts/signup-and-send-verification.cjs <email> [password] [name]');
  process.exit(1);
}

const ENDPOINT = (process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://resume.thewise.cloud').replace(/\/$/, '');
const apiKey = process.env.APPWRITE_API_KEY;
const resendKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error('Missing APPWRITE_API_KEY');
  process.exit(1);
}

async function createVerificationTokenAsUser(email, password, fallbackUserId) {
  const redirectUrl = `${FRONTEND_URL}/auth/verify-email`;
  const publicClient = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  const account = new sdk.Account(publicClient);

  try {
    await account.createEmailPasswordSession({ email, password });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/session is active|already signed/i.test(msg)) {
      throw err;
    }
  }

  let token;
  try {
    token = await account.createEmailVerification({ url: redirectUrl });
  } catch {
    token = await account.createVerification(redirectUrl);
  }

  if (!token?.secret) {
    throw new Error('createEmailVerification returned no secret');
  }

  const tokenUserId = token.userId || fallbackUserId;
  const verifyUrl = `${redirectUrl}?userId=${encodeURIComponent(tokenUserId)}&secret=${encodeURIComponent(token.secret)}`;
  return { verifyUrl, tokenUserId, secret: token.secret };
}

async function sendResend(to, verifyUrl) {
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — skipping Resend (Appwrite may still email).');
    console.log('Verify URL:', verifyUrl);
    return null;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${process.env.RESEND_FROM_NAME || 'WiseResume'} <${process.env.RESEND_FROM_EMAIL || 'noreply@thewise.cloud'}>`,
      to: [to],
      subject: 'Verify your WiseResume email address',
      html: `<p>Verify your WiseResume account:</p><p><a href="${verifyUrl}">Verify email</a></p><p style="word-break:break-all;font-family:monospace;font-size:12px;">${verifyUrl}</p>`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

async function main() {
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey);
  const users = new sdk.Users(client);

  let user;
  const existing = await users.list([sdk.Query.equal('email', [email]), sdk.Query.limit(1)]);
  if (existing.users[0]) {
    user = existing.users[0];
    console.log(`User exists: ${user.$id} emailVerification=${user.emailVerification}`);
    if (user.emailVerification) {
      await users.updateEmailVerification(user.$id, false);
      console.log('Reset emailVerification to false for fresh test.');
    }
  } else {
    user = await users.create(sdk.ID.unique(), email, undefined, password, name);
    console.log(`Created user: ${user.$id}`);
  }

  const { verifyUrl, tokenUserId, secret } = await createVerificationTokenAsUser(email, password, user.$id);
  const resendResult = await sendResend(email, verifyUrl);

  console.log(JSON.stringify({
    userId: tokenUserId,
    email,
    emailVerification: false,
    verifyUrl,
    secretPreview: `${secret.slice(0, 8)}…`,
    resendId: resendResult?.id || null,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
