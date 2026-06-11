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

const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function devKitToken() {
  const secret = process.env.APPWRITE_API_KEY;
  if (!secret) throw new Error('APPWRITE_API_KEY is required');
  const now = Date.now();
  const payload = { purpose: 'devkit', iat: now, exp: now + (15 * 60 * 1000), version: 2, uid: 'test-script' };
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

(async () => {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const functions = new sdk.Functions(client);
  const databases = new sdk.Databases(client);

  let total = 0;
  try {
    total = (await databases.listDocuments('main', 'visitor_events', [sdk.Query.limit(1)])).total || 0;
  } catch (e) {
    console.log('collection error:', e.message);
  }
  console.log('visitor_events total:', total);

  const auth = { Authorization: `Bearer ${devKitToken()}` };

  const t0 = Date.now();
  const dashBody = JSON.stringify({ action: 'dashboard', range: '7d', page_num: 0, __headers: auth });
  let ex = await functions.createExecution('admin-visitor-analytics', dashBody, false, '/', 'POST');
  console.log('dashboard:', ex.status, 'http:', ex.responseStatusCode, 'ms:', Date.now() - t0);
  if (ex.responseBody) {
    const j = JSON.parse(ex.responseBody);
    console.log('success:', j.success);
    if (j.data) {
      console.log('visits:', j.data.kpis?.totalVisits, 'unique:', j.data.kpis?.uniqueVisitors);
      console.log('meta:', j.data.meta);
      console.log('top countries:', (j.data.countryDist || []).slice(0, 3));
    } else {
      console.log('error:', j.error);
    }
  } else {
    console.log('errors:', ex.errors);
  }

  const liveBody = JSON.stringify({ action: 'live-count', __headers: auth });
  ex = await functions.createExecution('admin-visitor-analytics', liveBody, false, '/', 'POST');
  console.log('live-count body:', (ex.responseBody || ex.errors || '').slice(0, 240));
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
