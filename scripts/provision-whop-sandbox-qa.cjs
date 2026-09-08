'use strict';

// Appwrite-only, CI-safe QA account provisioning. Sensitive values are never
// printed; the canonical user ID is passed only through a masked GitHub output.
const fs = require('fs');
const sdk = require('node-appwrite');

const endpoint = (process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/$/, '');
const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const email = String(process.env.WISE_RESUME_E2E_EMAIL || '').trim().toLowerCase();
const password = String(process.env.WISE_RESUME_E2E_PASSWORD || '');
const apiKey = process.env.APPWRITE_API_KEY;

function fail(message) {
  console.error(`[qa-provision] ${message}`);
  process.exit(1);
}

if (!email || !password || !apiKey) fail('required Appwrite QA configuration is missing');

async function main() {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const users = new sdk.Users(client);
  const result = await users.list([sdk.Query.equal('email', [email]), sdk.Query.limit(1)]);
  let user = result.users?.[0];

  if (!user) {
    user = await users.create(sdk.ID.unique(), email, undefined, password, 'WiseResume Whop Sandbox QA');
  }

  // This is an isolated test identity. Marking it verified does not weaken
  // production authentication rules and avoids sending verification links.
  if (!user.emailVerification) await users.updateEmailVerification(user.$id, true);

  const id = String(user.$id || '');
  if (!id) fail('Appwrite did not return a canonical QA user ID');

  process.stdout.write(`::add-mask::${id}\n`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `qa_user_id=${id}\n`);
  }
  console.log('QA_USER_PROVISIONED=true');
}

main().catch(() => fail('Appwrite QA provisioning failed'));
