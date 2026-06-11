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

const client = new sdk.Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);
const functions = new sdk.Functions(client);
const users = new sdk.Users(client);

(async () => {
  const email = 'magdy.saber@outlook.com';
  const user = (await users.list([sdk.Query.equal('email', email), sdk.Query.limit(1)])).users[0];
  if (!user) throw new Error('user not found');
  const jwt = (await users.createJWT(user.$id)).jwt;
  const loginEx = await functions.createExecution(
    'admin-devkit-data',
    JSON.stringify({ action: 'verify-devkit-session', __headers: { 'X-Appwrite-JWT': jwt } }),
    false,
    '/',
    'POST',
  );
  const token = JSON.parse(loginEx.responseBody || '{}').session?.token;
  if (!token) throw new Error('no devkit token');

  const listEx = await functions.createExecution(
    'admin-portfolio-usernames',
    JSON.stringify({ action: 'directory_list', page: 1, per_page: 5, __headers: { Authorization: `Bearer ${token}` } }),
    false,
    '/',
    'POST',
  );
  const listBody = JSON.parse(listEx.responseBody || '{}');
  console.log('list success:', listBody.success, 'rows:', listBody.rows?.length);
  const row = listBody.rows?.[0];
  if (!row) return;

  for (const username of ['m', 'magdy-test-rename']) {
    const renameEx = await functions.createExecution(
      'admin-portfolio-usernames',
      JSON.stringify({
        action: 'directory_rename',
        user_id: row.user_id,
        new_username: username,
        __headers: { Authorization: `Bearer ${token}` },
      }),
      false,
      '/',
      'POST',
    );
    console.log(`\nrename -> ${username}`);
    console.log('http:', renameEx.responseStatusCode);
    console.log('body:', renameEx.responseBody);
  }

  const revertEx = await functions.createExecution(
    'admin-portfolio-usernames',
    JSON.stringify({
      action: 'directory_rename',
      user_id: row.user_id,
      new_username: 'magdy',
      __headers: { Authorization: `Bearer ${token}` },
    }),
    false,
    '/',
    'POST',
  );
  console.log('\nrevert -> magdy');
  console.log('http:', revertEx.responseStatusCode);
  console.log('body:', revertEx.responseBody);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
