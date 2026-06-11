#!/usr/bin/env node
'use strict';

/**
 * Grant the Appwrite "admin" label to a user by email.
 *
 * Usage:
 *   APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... node scripts/grant_admin_label.cjs magdy.saber@outlook.com
 *
 * Or load from .env.deploy if present (same vars as deploy_hubs.cjs).
 */

const fs = require('fs');
const path = require('path');
const { Client, Users, Query } = require('node-appwrite');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '..', '.env.deploy'));
loadEnvFile(path.join(__dirname, '..', '.env.local'));

const email = (process.argv[2] || '').trim().toLowerCase();
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!email) {
  console.error('Usage: node scripts/grant_admin_label.cjs <email>');
  process.exit(1);
}
if (!projectId || !apiKey) {
  console.error('Missing APPWRITE_PROJECT_ID and/or APPWRITE_API_KEY.');
  process.exit(1);
}

const users = new Users(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));

(async () => {
  const page = await users.list([Query.equal('email', email), Query.limit(1)]);
  const user = page.users[0];
  if (!user) {
    console.error(`No Appwrite user found for ${email}`);
    process.exit(1);
  }

  const labels = Array.isArray(user.labels) ? [...user.labels] : [];
  if (!labels.includes('admin')) labels.push('admin');

  await users.updateLabels(user.$id, labels);
  console.log(`Granted admin label to ${email} (${user.$id}). Labels: ${labels.join(', ')}`);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
