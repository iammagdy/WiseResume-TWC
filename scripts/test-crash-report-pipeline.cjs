#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');

function loadEnv(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...r] = t.split('=');
    if (!process.env[k]) process.env[k] = r.join('=').replace(/^["']|["']$/g, '');
  }
}

loadEnv('.env.deploy');

const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const apiKey = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';

function parseBody(raw) {
  if (!raw) return {};
  try {
    const outer = JSON.parse(raw);
    if (outer?.data && typeof outer.data === 'object') return outer.data;
    return outer;
  } catch {
    return {};
  }
}

(async () => {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new sdk.Databases(client);
  const functions = new sdk.Functions(client);
  const users = new sdk.Users(client);

  const before = await databases.listDocuments(DB_ID, 'moderation_bugs', [sdk.Query.limit(1)]);
  console.log('moderation_bugs before:', before.total);

  const email = 'magdy.saber@outlook.com';
  const user = (await users.list([sdk.Query.equal('email', email), sdk.Query.limit(1)])).users[0];
  if (!user) throw new Error(`User not found: ${email}`);
  const jwt = (await users.createJWT(user.$id)).jwt;

  const crashBody = {
    featureName: 'send-contact-email',
    type: 'auto-crash-report',
    email,
    message: 'ReferenceError: isLoading is not defined',
    metadata: {
      report_type: 'auto-crash-report',
      error_name: 'ReferenceError',
      error_message: 'ReferenceError: isLoading is not defined',
      route: '/dashboard',
      screen: 'Dashboard',
      user_email: email,
      source: 'error_boundary_auto',
      auto_report: true,
      app_version: 'pipeline-test',
    },
    __headers: { 'X-Appwrite-JWT': jwt },
  };

  for (let i = 1; i <= 2; i += 1) {
    const ex = await functions.createExecution(
      'ai-gateway',
      JSON.stringify(crashBody),
      false,
      '/',
      'POST',
    );
    const payload = parseBody(ex.responseBody);
    console.log(`invoke ${i}: status=${ex.status} http=${payload.success ?? payload.status} deduped=${payload.deduped ?? false} bug_report_id=${payload.bug_report_id ?? 'none'}`);
  }

  const after = await databases.listDocuments(DB_ID, 'moderation_bugs', [sdk.Query.limit(5), sdk.Query.orderDesc('$createdAt')]);
  console.log('moderation_bugs after:', after.total);
  for (const doc of after.documents.slice(0, 3)) {
    console.log(' -', doc.$id, doc.error_message?.slice(0, 60), doc.route, doc.status);
  }
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
